import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leaveease_project.settings')
django.setup()

from accounts.models import User
from leaves.models import LeaveType, Holiday, LeaveBalance

def populate():
    print("Populating initial data...")

    # 1. Create Leave Types
    leave_types_data = [
        {'name': 'Sick Leave', 'allocated_days': 12, 'color_code': '#ef4444', 'description': 'For medical leaves, illness, or doctor appointments.'},
        {'name': 'Casual Leave', 'allocated_days': 15, 'color_code': '#10b981', 'description': 'For personal reasons, vacation, or short casual breaks.'},
        {'name': 'Annual Leave', 'allocated_days': 20, 'color_code': '#3b82f6', 'description': 'Earned annual vacation leaves.'},
        {'name': 'Maternity Leave', 'allocated_days': 90, 'color_code': '#ec4899', 'description': 'Paid maternal leave for child birth.'},
    ]

    created_types = []
    for lt in leave_types_data:
        leave_type, created = LeaveType.objects.get_or_create(
            name=lt['name'],
            defaults={
                'allocated_days': lt['allocated_days'],
                'color_code': lt['color_code'],
                'description': lt['description']
            }
        )
        created_types.append(leave_type)
        if created:
            print(f"Created Leave Type: {lt['name']}")
        else:
            print(f"Leave Type exists: {lt['name']}")

    # 2. Create Public Holidays
    holidays_data = [
        {'name': "New Year's Day", 'date': '2026-01-01', 'description': 'Standard global start of year holiday.'},
        {'name': 'Independence Day', 'date': '2026-08-15', 'description': 'National Independence Day celebration.'},
        {'name': 'Thanksgiving Day', 'date': '2026-11-26', 'description': 'National Thanksgiving Day holiday.'},
        {'name': 'Christmas Day', 'date': '2026-12-25', 'description': 'Christmas festival holiday.'},
    ]

    for h in holidays_data:
        holiday, created = Holiday.objects.get_or_create(
            date=h['date'],
            defaults={
                'name': h['name'],
                'description': h['description']
            }
        )
        if created:
            print(f"Created Holiday: {h['name']} on {h['date']}")
        else:
            print(f"Holiday exists: {h['name']}")

    # 3. Create Admin User
    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@leaveease.com',
            'first_name': 'Admin',
            'last_name': 'User',
            'role': 'ADMIN',
            'is_superuser': True,
            'is_staff': True
        }
    )
    if created:
        admin_user.set_password('adminpassword')
        admin_user.save()
        print("Created Admin User: admin / adminpassword")
    else:
        print("Admin User already exists.")

    # 4. Create Employee User
    employee_user, created = User.objects.get_or_create(
        username='employee',
        defaults={
            'email': 'employee@leaveease.com',
            'first_name': 'John',
            'last_name': 'Doe',
            'role': 'EMPLOYEE',
            'department': 'Engineering',
            'designation': 'Software Engineer',
            'phone': '1234567890',
            'gender': 'MALE',
            'date_of_joining': '2025-01-10'
        }
    )
    if created:
        employee_user.set_password('employeepassword')
        employee_user.save()
        print("Created Employee User: employee / employeepassword")
    else:
        print("Employee User already exists.")

    # 5. Verify Leave Balances exist for Employee
    print("\nVerifying Leave Balances:")
    for lt in LeaveType.objects.all():
        balance, created = LeaveBalance.objects.get_or_create(
            user=employee_user,
            leave_type=lt,
            defaults={
                'allocated': lt.allocated_days,
                'used': 0,
                'remaining': lt.allocated_days
            }
        )
        print(f" - {lt.name} balance for {employee_user.username}: {balance.remaining}/{balance.allocated} days left")

    print("\nData population completed successfully!")

if __name__ == '__main__':
    populate()
