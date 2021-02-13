#Program for defining the collection type

#List Collection Type
int_list=[1,2,3]
string_list=["abc","def","ghi"]
mixed_list=[1,2,"abc","def"]
nested_list=["abc",[1,2,3],"ghi",[8,9,0]]

print(string_list[2])
print(mixed_list[-1])
print(nested_list[3][1])

#Append Function
string_list.append("Rateesh")
print(string_list)

#Insert Function
string_list.insert(1,"CAT")
print(string_list)

#Remove Function
string_list.remove("Rateesh")
print(string_list)

#Reverse Function
string_list.reverse()
print(string_list)

"""Tuple Colleciton Type

It is same as List Collection Type except you cannot append, insert and remove from the collection list"""


#Dictionary Collection Type - Collection of Key and Value

name_desi={
'Rateesh':'CEO',
'John':'COO',
'George':'CTO'
}

desig=name_desi['John']
print(desig)

#Set Collection Type - Same as list but without repetation

my_list=[1,1,2,2,3]
my_set=set(my_list)
print(my_set)