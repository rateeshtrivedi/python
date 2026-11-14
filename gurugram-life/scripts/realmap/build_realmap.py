#!/usr/bin/env python3
"""Real Gurugram for the game, from OpenStreetMap.

usage: python3 build_realmap.py <haryana.osm.pbf> <out.json.gz>
  (the Haryana extract: https://download.openstreetmap.fr/extracts/asia/india/haryana-latest.osm.pbf)

Reads every road, building and land-use area in central Gurugram and writes a compact file the game loads:
  roads: [class, width, x0, z0, x1, z1, ...]      (a polyline, widened to a playable minimum)
  bld:   [style, floors, x0, z0, x1, z1, ...]     (a footprint; floors estimated where OSM has none)
  land:  [kind, x0, z0, ...]                       (parks, water, commercial areas, ...)
  names: a string table; rn[i] = name of roads[i] (-1 = none)
  metro: [line, name, x0, z0, ...]                 (1 Yellow Line, 2 Rapid Metro: elevated viaducts)
  stations: [name, line, x, z]
  places: [kind, name, x, z]                       (1 sector, 2 locality, 3 park, 4 market/business area, 5 landmark, 6 chowk)
Only places, roads, transit and landmark complexes are named; shops and restaurants keep the game's own made-up names.
Coordinates are game units, quantised to 1/Q of a unit. x is east, z is south. Distances are compressed (S units per
metre) but heights stay human-sized, so the city is quicker to cross yet doors and floors look right.
Data (c) OpenStreetMap contributors, ODbL: the output file is a derived database under the same licence.
"""
import gzip, json, math, sys, hashlib
import osmium

LAT0, LAT1, LON0, LON1 = 28.41, 28.51, 77.01, 77.11          # central Gurugram
OLAT, OLON = 28.46, 77.06                                       # map origin (between Rajiv Chowk and IFFCO Chowk)
S = 0.5                                                         # game units per metre, horizontally
Q = 4                                                           # coordinate quantisation (1/4 unit)
KX = math.cos(math.radians(OLAT)) * 111320; KY = 110540
def xy(lat, lon): return ((lon - OLON) * KX * S, -(lat - OLAT) * KY * S)

ROAD = {  # class id, minimum width (units) — wide enough for game cars
    'motorway': (1, 22), 'trunk': (1, 20), 'primary': (2, 16), 'secondary': (3, 13), 'tertiary': (4, 11),
    'motorway_link': (5, 9), 'trunk_link': (5, 9), 'primary_link': (5, 9), 'secondary_link': (5, 9), 'tertiary_link': (5, 9),
    'unclassified': (6, 8), 'residential': (6, 7), 'living_street': (6, 6), 'service': (7, 4.5), 'pedestrian': (8, 5)}
LAND = {'park': 1, 'garden': 1, 'grass': 1, 'recreation_ground': 1, 'village_green': 1, 'pitch': 2, 'water': 3, 'basin': 3,
        'reservoir': 3, 'wetland': 3, 'commercial': 4, 'retail': 4, 'industrial': 5, 'residential': 6, 'forest': 7, 'wood': 7,
        'grassland': 1, 'scrub': 7, 'construction': 8, 'farmland': 9, 'meadow': 1}
# building styles the game draws: 1 house (plaster, water tank), 2 apartment tower, 3 office glass, 4 shops below + flats,
# 5 industrial shed, 6 mall/big box, 7 temple/school/public
def dp(pts, eps):  # Douglas-Peucker
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-9
    i, d = max(((i, abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / L) for i, p in enumerate(pts[1:-1], 1)), key=lambda t: t[1])
    return dp(pts[:i + 1], eps)[:-1] + dp(pts[i:], eps) if d > eps else [a, b]
def area(p): return abs(sum(p[i][0] * p[i - 1][1] - p[i - 1][0] * p[i][1] for i in range(len(p)))) / 2
def h01(s): return int(hashlib.md5(s.encode()).hexdigest()[:8], 16) / 0xffffffff

class H(osmium.SimpleHandler):
    def __init__(s): super().__init__(); s.roads = []; s.blds = []; s.land = []; s.metro = []; s.stations = []; s.places = []
    def node(s, n):
        t = n.tags; nm = t.get('name:en') or t.get('name')
        if not nm or not n.location.valid(): return
        la, lo = n.location.lat, n.location.lon
        if not (LAT0 < la < LAT1 and LON0 < lo < LON1): return
        x, z = xy(la, lo)
        if t.get('railway') in ('station', 'stop', 'halt') and (t.get('station') in ('subway', 'light_rail', 'monorail') or t.get('subway') == 'yes' or t.get('railway') == 'stop' or 'metro' in nm.lower() or 'rapid' in (t.get('network', '') + t.get('operator', '')).lower()):
            line = 2 if 'rapid' in (t.get('network', '') + t.get('operator', '') + nm).lower() or 'RMRG' in nm or nm in ('Moulsari Avenue Station', 'Phase 3', 'Belvedere Towers', 'Cyber City', 'Phase 2', 'Phase 1', 'Sector 42-43', 'Sector 53-54', 'Sector 54 Chowk', 'Sector 55-56', 'Indusind Bank Cyber City', 'Micromax Moulsari Avenue', 'Vodafone Belvedere Towers', 'IndusInd Bank Cyber City', 'DLF Phase 2', 'DLF Phase 3') else 1
            s.stations.append((nm.replace(' Metro Station', '').replace(' RMRG Station', '').replace(' Station', ''), line, x, z))
        elif t.get('place') in ('suburb',): s.places.append((1, nm, x, z))
        elif t.get('place') in ('locality', 'neighbourhood', 'quarter', 'village', 'hamlet'): s.places.append((2, nm, x, z))
        elif ('chowk' in nm.lower() or 'crossing' in nm.lower()) and ('highway' in t or 'junction' in t or 'place' in t): s.places.append((6, nm, x, z))
    def way(s, w):
        t = w.tags
        try: nodes = [(n.lat, n.lon) for n in w.nodes]
        except Exception: return
        if not nodes or not any(LAT0 < la < LAT1 and LON0 < lo < LON1 for la, lo in nodes): return
        pts = [xy(la, lo) for la, lo in nodes]
        if 'highway' in t and t['highway'] in ROAD:
            c, wmin = ROAD[t['highway']]; lanes = t.get('lanes'); w0 = wmin
            try: w0 = max(wmin, float(lanes) * 3.4 * S * 1.6)
            except Exception: pass
            s.roads.append((c, min(w0, 30), dp(pts, 0.8), t.get('name:en') or t.get('name', '')))
            return
        nm = t.get('name:en') or t.get('name') or ''
        if t.get('railway') in ('subway', 'light_rail', 'monorail') and len(pts) >= 2:
            line = 2 if 'rapid' in (nm + t.get('network', '') + t.get('operator', '')).lower() else 1
            s.metro.append((line, nm or ('Rapid Metro' if line == 2 else 'Yellow Line'), dp(pts, 1.0)))
            return
        if nm and len(pts) >= 3:  # named areas become labels at their middle
            cx = sum(p[0] for p in pts) / len(pts); cz = sum(p[1] for p in pts) / len(pts)
            if t.get('leisure') in ('park', 'garden'): s.places.append((3, nm, cx, cz))
            elif t.get('landuse') in ('retail', 'commercial') or t.get('shop') == 'mall': s.places.append((4 if t.get('shop') != 'mall' else 5, nm, cx, cz))
            elif t.get('place') in ('suburb',): s.places.append((1, nm, cx, cz))
            elif t.get('place') in ('locality', 'neighbourhood', 'quarter') or (t.get('landuse') == 'residential' and len(nm) < 30): s.places.append((2, nm, cx, cz))
        if 'building' in t and len(pts) >= 4:
            s.blds.append((t.get('building'), t.get('building:levels'), t.get('height'), t.get('name', ''), t.get('amenity', '') or t.get('shop', ''), dp(pts[:-1] if pts[0] == pts[-1] else pts, 0.4), w.id))
        else:
            k = t.get('landuse') or t.get('leisure') or t.get('natural')
            if k in LAND and len(pts) >= 4: s.land.append((LAND[k], dp(pts, 1.0)))

def main(src, out):
    h = H(); h.apply_file(src, locations=True)
    # land-use grid, so a building knows if it stands in a commercial, industrial or residential area
    G = 60; grid = {}
    for kind, poly in h.land:
        xs = [p[0] for p in poly]; zs = [p[1] for p in poly]
        for gx in range(int(min(xs) // G), int(max(xs) // G) + 1):
            for gz in range(int(min(zs) // G), int(max(zs) // G) + 1): grid.setdefault((gx, gz), []).append((kind, poly))
    def inside(p, poly):
        x, z = p; c = False; n = len(poly)
        for i in range(n):
            x1, z1 = poly[i]; x2, z2 = poly[(i + 1) % n]
            if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1 + 1e-12) + x1: c = not c
        return c
    def landAt(p):
        for kind, poly in grid.get((int(p[0] // G), int(p[1] // G)), []):
            if kind in (4, 5, 6) and inside(p, poly): return kind
        return 0
    # road segments in a grid, to drop buildings that would sit on a widened road
    RG = 30; rgrid = {}
    for c, w, pts, _ in h.roads:
        if c >= 7: continue  # driveways, parking lanes and footpaths never push buildings away
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            for gx in range(int(min(a[0], b[0]) // RG) - 1, int(max(a[0], b[0]) // RG) + 2):
                for gz in range(int(min(a[1], b[1]) // RG) - 1, int(max(a[1], b[1]) // RG) + 2): rgrid.setdefault((gx, gz), []).append((a, b, w / 2, c))
    def segd(p, a, b):
        dx, dz = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dz * dz or 1e-9; k = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2))
        return math.hypot(p[0] - a[0] - k * dx, p[1] - a[1] - k * dz)
    def near(p):
        return rgrid.get((int(p[0] // RG), int(p[1] // RG)), [])
    def fit(poly):  # trim a building back to the kerb where a (widened) road would cut into it; None if it sits on the road
        cx = sum(q[0] for q in poly) / len(poly); cz = sum(q[1] for q in poly) / len(poly)
        for a, b, hw, c in near((cx, cz)):
            if segd((cx, cz), a, b) < hw: return None
        out = []
        for p in poly:
            x, z = p
            for a, b, hw, c in near(p):
                dx, dz = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dz * dz or 1e-9; k = max(0, min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2))
                px, pz = a[0] + k * dx, a[1] + k * dz; d = math.hypot(x - px, z - pz)
                if d < hw + 0.3:
                    nx, nz = ((x - px) / d, (z - pz) / d) if d > 1e-6 else ((cx - px), (cz - pz)); nl = math.hypot(nx, nz) or 1; x, z = px + nx / nl * (hw + 0.3), pz + nz / nl * (hw + 0.3)
            out.append((x, z))
        return out if area(out) > 4 else None
    def mainRoad(p, dist):
        for gx in (-1, 0, 1):
            for gz in (-1, 0, 1):
                for a, b, hw, c in rgrid.get((int(p[0] // RG) + gx, int(p[1] // RG) + gz), []):
                    if c <= 3 and segd(p, a, b) < hw + dist: return True
        return False
    blds = []; dropped = 0
    for typ, lv, ht, name, amen, poly, wid in h.blds:
        if len(poly) < 3: continue
        A = area(poly) / (S * S)  # real square metres
        if A < 12: continue
        poly = fit(poly)
        if poly is None: dropped += 1; continue
        cx = sum(p[0] for p in poly) / len(poly); cz = sum(p[1] for p in poly) / len(poly); land = landAt((cx, cz)); r = h01(str(wid)); onMain = mainRoad((cx, cz), 45)
        floors = None
        try: floors = max(1, min(60, int(float(lv))))
        except Exception:
            try: floors = max(1, min(60, round(float(str(ht).split()[0]) / 3.2)))
            except Exception: floors = None
        t = typ or 'yes'
        if t in ('office',) or (land == 4 and A > 1200) or (onMain and A > 1800 and land != 6): style = 3
        elif t in ('commercial', 'retail', 'hotel') or (land == 4) or (onMain and 120 < A <= 1800 and r < 0.6): style = 4 if A < 1200 else 6
        elif t in ('industrial', 'warehouse') or land == 5: style = 5
        elif t in ('school', 'temple', 'religious', 'hospital', 'public', 'government', 'college', 'university', 'mosque', 'church', 'gurudwara') or amen in ('place_of_worship', 'school', 'hospital'): style = 7
        elif t in ('apartments',) or (A > 650 and t in ('yes', 'residential') and land in (0, 6)): style = 2
        else: style = 1
        if floors is None:
            if style == 3: floors = int(6 + r * 18) if A > 2500 else int(4 + r * 6)
            elif style == 2: floors = int(12 + r * 12) if A > 900 else int(5 + r * 6)
            elif style == 6: floors = int(3 + r * 3)
            elif style == 5: floors = 1 + (r > 0.7)
            elif style == 7: floors = 2 + (r > 0.5)
            elif style == 4: floors = int(2 + r * 3)
            else: floors = 2 + (r > 0.45) + (r > 0.85) if A < 250 else 3 + (r > 0.6)
        blds.append([style, floors] + [v for p in poly for v in (round(p[0] * Q), round(p[1] * Q))])
    import re
    LANDMARK = re.compile(r'(tower|plaza|mall|market|centre|center|complex|hub|square|heights|court|city|park|arcade|metropolitan|galleria)', re.I)
    for typ, lv, ht, name, amen, poly, wid in h.blds:
        if name and LANDMARK.search(name) and not re.search(r'(ltd|pvt|inc\b|bank|hotel|hospital|clinic|school|block [a-z]$|^tower [a-z0-9-]+$|^building)', name, re.I) and area(poly) / (S * S) > 900:
            cx = sum(p[0] for p in poly) / len(poly); cz = sum(p[1] for p in poly) / len(poly); h.places.append((5, name, cx, cz))
    BAD = re.compile(r'(pvt|ltd|hospital|hotel|clinic|learning|school|college|^building|bank|office|private|limited|\binc\b)', re.I)
    h.places = [q for q in h.places if not (q[0] in (4, 5) and BAD.search(q[1]))]
    for nm, la, lo in (('Rajiv Chowk', 28.4475, 77.0328),): h.places.append((6, nm) + xy(la, lo))  # well-known spots OSM only names as an underpass
    h.stations = [(('Gurgaon Railway Station' if n == 'Gurgaon' else n), line, x, z) for n, line, x, z in h.stations]
    # one label per name nearby: OSM often has the same place as a node and an area
    places = []
    for k, n, x, z in sorted(h.places, key=lambda q: q[0]):
        if any(n == q[1] and math.hypot(x - q[2], z - q[3]) < 300 for q in places): continue
        places.append((k, n, x, z))
    stations = []
    for n, line, x, z in h.stations:
        if any(math.hypot(x - q[2], z - q[3]) < 60 for q in stations): continue
        stations.append((n, line, x, z))
    NAMES = []; NI = {}
    def ni(n):
        if not n: return -1
        if n not in NI: NI[n] = len(NAMES); NAMES.append(n)
        return NI[n]
    rn = [ni(n) for c, w, pts, n in h.roads if len(pts) >= 2]
    metro = [[line, ni(n)] + [v for p in pts for v in (round(p[0] * Q), round(p[1] * Q))] for line, n, pts in h.metro]
    pl = [[k, ni(n), round(x), round(z)] for k, n, x, z in places]
    stn = [[ni(n), line, round(x), round(z)] for n, line, x, z in stations]
    roads = [[c, round(w * Q)] + [v for p in pts for v in (round(p[0] * Q), round(p[1] * Q))] for c, w, pts, _ in h.roads if len(pts) >= 2]
    land = [[k] + [v for p in poly for v in (round(p[0] * Q), round(p[1] * Q))] for k, poly in h.land if k in (1, 2, 3, 7)]
    names = sorted({(c, n) for c, w, pts, n in h.roads if n and c <= 4})
    x0, z0 = xy(LAT1, LON0); x1, z1 = xy(LAT0, LON1)
    data = {'v': 1, 'S': S, 'Q': Q, 'origin': [OLAT, OLON], 'bounds': [round(x0), round(z0), round(x1), round(z1)], 'floor': 3.4,
            'credit': 'Map data (c) OpenStreetMap contributors, ODbL', 'roads': roads, 'bld': blds, 'land': land,
            'names': NAMES, 'rn': rn, 'metro': metro, 'stations': stn, 'places': pl}
    raw = json.dumps(data, separators=(',', ':')).encode()
    with gzip.open(out, 'wb', 9) as f: f.write(raw)
    st = {}
    for b in blds: st[b[0]] = st.get(b[0], 0) + 1
    print('names', len(NAMES), 'metro ways', len(metro), 'stations', len(stn), 'places', len(pl), {k: sum(1 for q in pl if q[0] == k) for k in range(1, 7)})
    print('roads', len(roads), 'buildings', len(blds), 'dropped on roads', dropped, 'land', len(land), 'styles', st, 'raw MB', round(len(raw) / 1e6, 2))

if __name__ == '__main__': main(sys.argv[1], sys.argv[2])
