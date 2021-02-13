
#PRogram to use Write and Read method for the file object

file_obj=open("demofile.txt","r+")

file_obj.write("My Name is Rateesh \nI am your Instructor!")

file_obj.close()

file_obj2=open("demofile.txt","r")

file_str=file_obj2.read()

print(file_str)