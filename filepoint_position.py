
file_obj=open("demofile.txt","r")

position_pointer=file_obj.tell()
print(position_pointer)

file_obj.seek(10,0)
position_pointer=file_obj.tell()
print(position_pointer)