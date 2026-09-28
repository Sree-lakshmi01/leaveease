from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    model = User
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Info', {'fields': ('role', 'department', 'designation', 'phone', 'gender', 'profile_pic', 'date_of_joining')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Info', {'fields': ('role', 'department', 'designation', 'phone', 'gender', 'profile_pic', 'date_of_joining')}),
    )
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'department', 'is_staff']
    list_filter = ['role', 'department', 'is_staff']

admin.site.register(User, CustomUserAdmin)
