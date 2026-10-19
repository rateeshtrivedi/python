# raw/<slug>--<view>.png -> public/img/places/<slug>-<n>.webp (1200x675), <slug>-og.jpg (1200x630 with a name banner),
# and server/images.js (src, alt, size) for the pages
import glob, os, json, sys
from PIL import Image, ImageDraw, ImageFont
G = '/home/user/python/gurugram-life'; sys.path.insert(0, '.')
NAMES = json.load(open('names.json'))
ALT = {'towers@dlf-cyber-city': 'Glass office towers of DLF Cyber City in Gurugram Life', 'ipl': 'IPL screening night at Cyber Hub in Gurugram Life',
  'baraat': 'Baraat procession on Golf Course Road in Gurugram Life', 'flood@golf-course-extension': 'Heavy monsoon rain at Golf Course Extension in Gurugram Life',
  'holi': 'Holi colours on Sohna Road in Gurugram Life', 'jam': 'The traffic police naka near Iffco Chowk in Gurugram Life', 'sign': 'The giant GURUGRAM sign at Rajiv Chowk in Gurugram Life',
  'fountain': 'The Rajiv Chowk fountain at sunset in Gurugram Life', 'flood@huda-city-centre': 'Heavy rain at Huda City Centre in Gurugram Life',
  'club': 'Neon Nights club in Sector 29 at night, Gurugram Life', 'lanes': 'Shops in Sector 14 Market in Gurugram Life', 'carts': 'Chaat carts at Galleria Market in Gurugram Life',
  'bazaar': 'Crowded lanes of Sadar Bazaar in Gurugram Life', 'temple': 'Sheetla Mata Mandir in Old Gurgaon, Gurugram Life', 'chaupal': 'The village chaupal in Badshahpur, Gurugram Life',
  'dangal': 'Dangal with the pehlwan at the Leisure Valley akhara, Gurugram Life', 'mall': 'Ambience Mall in Gurugram Life', 'showroom': 'Chaudhary Motors showroom on the NH-48 Auto Mile, Gurugram Life',
  'toll': 'Kherki Daula toll on NH-48 in Gurugram Life', 'homes': 'Evening in DLF Phase 3 in Gurugram Life', 'towers@sikanderpur': 'Towers around Sikanderpur metro in Gurugram Life',
  'rain': 'Heavy rain in Sushant Lok, Gurugram Life', 'towers@sector-56': 'Residential towers in Sector 56, Gurugram Life', 'hospital': 'Civil Hospital in Gurugram Life',
  'farm': 'Farmhouse party lawn in Bhondsi, Gurugram Life', 'lake': 'A boat on the lake at Aravali Biodiversity Park, Gurugram Life', 'factory': 'Factories in Manesar, Gurugram Life',
  'drive': 'Driving a Desert King 4x4 on a Gurugram road in Gurugram Life', 'fight': 'Street fight with a chhora in Gurugram Life', 'map': 'Top-down view of the Gurugram Life city map'}
order = {}
for f in sorted(glob.glob('raw/*.png')):
    slug, view = os.path.basename(f)[:-4].split('--'); order.setdefault(slug, []).append((view, f))
views = json.load(open('order.json'))  # slug -> view names in page order
fb = ImageFont.truetype('/tmp/claude-0/-home-user-python/93a9db14-3a8f-54ce-881e-11b23da58715/scratchpad/fonts/fontsource-baloo-2-5.0.20/files/baloo-2-latin-800-normal.woff2', 60) if os.path.exists('/tmp/claude-0/-home-user-python/93a9db14-3a8f-54ce-881e-11b23da58715/scratchpad/fonts/fontsource-baloo-2-5.0.20/files/baloo-2-latin-800-normal.woff2') else ImageFont.load_default()
fs = ImageFont.truetype('/tmp/claude-0/-home-user-python/93a9db14-3a8f-54ce-881e-11b23da58715/scratchpad/fonts/fontsource-baloo-2-5.0.20/files/baloo-2-latin-800-normal.woff2', 34) if os.path.exists('/tmp/claude-0/-home-user-python/93a9db14-3a8f-54ce-881e-11b23da58715/scratchpad/fonts/fontsource-baloo-2-5.0.20/files/baloo-2-latin-800-normal.woff2') else ImageFont.load_default()
manifest = {}
for slug, items in order.items():
    d = 'how' if slug == 'how-to-play' else 'places'; os.makedirs(f'{G}/public/img/{d}', exist_ok=True)
    items.sort(key=lambda v: views.get(slug, []).index(v[0]) if v[0] in views.get(slug, []) else 99); out = []
    name = NAMES.get(slug, 'Gurugram Life')
    for n, (view, f) in enumerate(items, 1):
        im = Image.open(f).convert('RGB').resize((1200, 675), Image.LANCZOS); src = f'/img/{d}/{slug}-{n}.webp'; im.save(G + '/public' + src, 'WEBP', quality=72, method=6)
        alt = ALT.get(f'{view}@{slug}') or ALT.get(view) or (f'Street scene in {name}, Gurugram, in the Gurugram Life game' if view == 'street' else f'Aerial view of {name} on the Gurugram Life game map' if view == 'wide' else f'{name} in Gurugram Life')
        out.append({'src': src, 'alt': alt, 'w': 1200, 'h': 675})
    # share image: the first screenshot, cropped to 1200x630, with a name banner
    og = Image.open(items[0][1]).convert('RGB').resize((1200, 675), Image.LANCZOS).crop((0, 22, 1200, 652)); dr = ImageDraw.Draw(og, 'RGBA')
    dr.rectangle((0, 470, 1200, 630), fill=(27, 20, 16, 215)); dr.rectangle((0, 466, 1200, 472), fill=(246, 192, 38, 255))
    dr.text((44, 478), name if slug != 'how-to-play' else 'How to play', font=fb, fill=(246, 192, 38)); dr.text((46, 560), 'Gurugram Life · free 3D Gurugram game · gurugramlife.com', font=fs, fill=(255, 244, 216))
    og.save(f'{G}/public/img/{d}/{slug}-og.jpg', 'JPEG', quality=84, optimize=True); manifest[slug] = out
open(f'{G}/server/images.js', 'w').write('// Screenshots for the info pages (made by the scratchpad seoimg/build.py from real gameplay captures).\nexport const IMAGES = ' + json.dumps(manifest, ensure_ascii=False, indent=0) + ';\n')
print(len(manifest), 'pages,', sum(len(v) for v in manifest.values()), 'images')
