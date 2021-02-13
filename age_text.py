#Program to identify whether individual is Kid, Teenager, Adult or old

while True:

	age_input=int(input("Please Enter your Age: "))

	if age_input<=12 and age_input>=0:
		print("You are a Kid!")
	elif age_input>=13 and age_input<=18:
		print("You are a Teenager!")
	elif age_input>=18 and age_input<=50:
		print("You are Adult!")
	else:
		break