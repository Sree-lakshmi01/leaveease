from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('HR', 'HR Manager'),
        ('EMPLOYEE', 'Employee'),
    )
    GENDER_CHOICES = (
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other'),
    )
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='EMPLOYEE')
    department = models.CharField(max_length=100, blank=True, null=True)
    designation = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    profile_pic = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    date_of_joining = models.DateField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"
