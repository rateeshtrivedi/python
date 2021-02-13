
class EmpOrg:
	def __init__(self,first_name,last_name,salary):
		self.f_name=first_name
		self.l_name=last_name
		self.sal=salary
		
	def __add__(self,other):
		totalsal=self.sal+other.sal
		return totalsal

obj1=EmpOrg("Rateesh","Trivedi",70000)
obj2=EmpOrg("John","Carter",80000)
print("Total Payable Salary: ",obj1+obj2)