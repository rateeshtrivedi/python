
# PRogram to open the file object and use file attributes

file_obj=open("demofile.txt","w")
print(file_obj.name)
print(file_obj.mode)
print(file_obj.closed)

file_obj.close()
print(file_obj.closed)