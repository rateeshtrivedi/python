
class EmpOrg():
	initial_value=100
	
	def __init__(self,first,last,salary):
		self.f_name=first
		self.l_name=last
		self.sal=salary
		
	@classmethod
	def initial_value_set(cls,amt):
		cls.initial_value=True
		
		
obj1=EmpOrg("Rateesh","Trivedi",70000)
obj2=EmpOrg("John","Carter",80000)
EmpOrg.initial_value_set(150)
print(obj1.initial_value)
print(obj2.initial_value)