import os
import django
from datetime import datetime, time, timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leaveease_project.settings')
django.setup()

from accounts.models import User
from leaves.models import Attendance
from django.utils import timezone

def seed_attendance():
    today = timezone.now().date()
    employees = User.objects.filter(is_active=True)

    print(f"Seeding attendance for {employees.count()} users up to {today}...")

    # Generate dates for past 30 days
    start_date = today - timedelta(days=25)
    current_date = start_date

    while current_date <= today:
        # Skip weekends (Saturday=5, Sunday=6)
        if current_date.weekday() < 5:
            for user in employees:
                if current_date == today:
                    # For today:
                    # User 1 & 2: Active (checked in, not checked out)
                    if user.username in ['employee', 'Rahul', 'amritha']:
                        att, created = Attendance.objects.get_or_create(
                            user=user,
                            date=current_date,
                            defaults={
                                'check_in': time(9, random.choice([0, 5, 12, 15])),
                                'status': 'PRESENT'
                            }
                        )
                    elif user.username in ['shehim', 'Sooraj']:
                        # Checked out today
                        att, created = Attendance.objects.get_or_create(
                            user=user,
                            date=current_date,
                            defaults={
                                'check_in': time(9, 0),
                                'check_out': time(18, 15),
                            }
                        )
                else:
                    # Past weekdays
                    rand_val = random.random()
                    if rand_val < 0.75:
                        # Full Present Day (8.5 - 9.5 total hours)
                        check_in_m = random.choice([0, 5, 10, 15])
                        check_out_h = random.choice([17, 18, 18, 19])
                        check_out_m = random.choice([0, 15, 30])
                        Attendance.objects.get_or_create(
                            user=user,
                            date=current_date,
                            defaults={
                                'check_in': time(9, check_in_m),
                                'check_out': time(check_out_h, check_out_m),
                            }
                        )
                    elif rand_val < 0.88:
                        # Half-Day (4.5 - 5.5 hours)
                        Attendance.objects.get_or_create(
                            user=user,
                            date=current_date,
                            defaults={
                                'check_in': time(9, 0),
                                'check_out': time(14, 0),
                            }
                        )
                    else:
                        # Absent
                        Attendance.objects.get_or_create(
                            user=user,
                            date=current_date,
                            defaults={
                                'check_in': None,
                                'check_out': None,
                                'status': 'ABSENT',
                                'total_hours': 0.00
                            }
                        )
        current_date += timedelta(days=1)

    print("Attendance seeding complete successfully!")

if __name__ == '__main__':
    seed_attendance()
