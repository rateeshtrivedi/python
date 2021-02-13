
class A():
	def sum1(self,a,b):
		print("In a Class A")
		c=a+b
		return c
	
class B(A):
	def sum1(self,a,b):
		print("In a Class B")
		c=a*a+b*b
		return c

b_obj=B()
print(b_obj.sum1(4,5))
		