
class OrgEmp:
	def __init__(self,first_name,last_name,emp_code):
		self.f_name=first_name
		self.l_name=last_name
		self.emp=emp_code
		self.full_name=first_name+" "+last_name
		
class DeptEmp(OrgEmp):
	pass

obj1=DeptEmp("Rateesh","Trivedi",1754)
obj2=OrgEmp("John","Carter",2020)

print(obj1.f_name)
print(obj2.f_name)