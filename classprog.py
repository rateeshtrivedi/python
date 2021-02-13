
class EmpOrg:
	def __init__(self,first_name,last_name,emp_code):
		self.f_name=first_name
		self.l_name=last_name
		self.emp=emp_code

obj1=EmpOrg("Rateesh","Trivedi",1754)
obj2=EmpOrg("John","Carter",2020)

print(obj1.f_name)
print(obj1.l_name)
print(obj2.f_name)
print(obj2.l_name)
