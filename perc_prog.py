
class MarkSheet:
	outofmarks=100
	
	def __init__(self,first_name,last_name,roll_num,eng_marks,maths_marks,sci_marks):
		self.f_name=first_name
		self.l_name=last_name
		self.roll=roll_num
		self.eng=int(eng_marks)
		self.maths=int(maths_marks)
		self.sci=int(sci_marks)
		self.engper=(self.eng*int(self.outofmarks))/int(self.outofmarks)
		self.mathsper=(self.maths*int(self.outofmarks))/int(self.outofmarks)
		self.sciper=(self.sci*int(self.outofmarks))/int(self.outofmarks)
		
first_name=input("Enter the Student First Name: ")
last_name=input("Enter the Student Last Name: ")
rol_num=input("Enter the Student Roll No.: ")
eng_marks=input("Enter the Student's English Marks: ")
maths_marks=input("Enter the Student's Maths Marks: ")
sci_marks=input("Enter the Student's Science Marks: ")

obj1=MarkSheet(first_name,last_name,rol_num,eng_marks,maths_marks,sci_marks)
print("The Percentage of English Marks is: "+str(obj1.engper)+"%")
print("The Percentage of Maths Marks is: "+str(obj1.mathsper)+"%")
print("The Percentage of Science Marks is: "+str(obj1.sciper)+"%")