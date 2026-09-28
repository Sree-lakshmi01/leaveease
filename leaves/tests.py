from django.test import TestCase
from django.utils import timezone
from accounts.models import User
from .models import LeaveType, LeaveBalance, LeaveRequest
from .forms import LeaveRequestForm
import datetime

class LeaveSystemTestCase(TestCase):
    def setUp(self):
        # 1. Create a LeaveType
        self.sick_leave = LeaveType.objects.create(
            name="Sick Leave",
            allocated_days=10,
            color_code="#ef4444"
        )
        
        # 2. Create Employee
        self.employee = User.objects.create_user(
            username="test_emp",
            password="password123",
            role="EMPLOYEE"
        )
        
        # 3. Create Admin
        self.admin = User.objects.create_user(
            username="test_admin",
            password="password123",
            role="ADMIN"
        )

    def test_leave_balance_auto_creation(self):
        # Check if post_save signal created the LeaveBalance for the employee
        try:
            balance = LeaveBalance.objects.get(user=self.employee, leave_type=self.sick_leave)
            self.assertEqual(balance.allocated, 10)
            self.assertEqual(balance.remaining, 10)
            self.assertEqual(balance.used, 0)
        except LeaveBalance.DoesNotExist:
            self.fail("LeaveBalance was not auto-created on User creation.")

    def test_leave_request_duration(self):
        # Check leave duration calculation
        start = datetime.date(2026, 8, 1)
        end = datetime.date(2026, 8, 5) # 5 days
        
        req = LeaveRequest.objects.create(
            user=self.employee,
            leave_type=self.sick_leave,
            start_date=start,
            end_date=end,
            reason="Feeling sick"
        )
        
        self.assertEqual(req.duration, 5)

    def test_leave_request_form_overlap(self):
        # Create an approved request first
        LeaveRequest.objects.create(
            user=self.employee,
            leave_type=self.sick_leave,
            start_date=datetime.date(2026, 8, 1),
            end_date=datetime.date(2026, 8, 5),
            status="APPROVED",
            reason="Approved leave"
        )
        
        # Attempt to apply for overlapping dates (Aug 4 to Aug 8)
        form_data = {
            'leave_type': self.sick_leave.id,
            'start_date': '2026-08-04',
            'end_date': '2026-08-08',
            'reason': 'Overlapping request'
        }
        
        form = LeaveRequestForm(data=form_data, user=self.employee)
        self.assertFalse(form.is_valid())
        self.assertIn("You have already applied for leave during these dates.", form.non_field_errors())

    def test_ai_agent_approval(self):
        from .ai_service import evaluate_leave_request_with_ai
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        doc = SimpleUploadedFile("doctor_note.pdf", b"Medical proof contents", content_type="application/pdf")
        
        req = LeaveRequest.objects.create(
            user=self.employee,
            leave_type=self.sick_leave,
            start_date=datetime.date(2026, 9, 10),
            end_date=datetime.date(2026, 9, 12),
            reason="High fever and flu",
            medical_certificate=doc,
            status="ADMIN_PENDING"
        )
        
        result = evaluate_leave_request_with_ai(req)
        self.assertEqual(result['action'], 'APPROVED')
        req.refresh_from_db()
        self.assertEqual(req.status, 'APPROVED')
        
        # Check leave balance deduction (3 days)
        bal = LeaveBalance.objects.get(user=self.employee, leave_type=self.sick_leave)
        self.assertEqual(bal.used, 3)
        self.assertEqual(bal.remaining, 7)


class AttendanceTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="emp_attendee",
            password="password123",
            role="EMPLOYEE"
        )
        self.client.login(username="emp_attendee", password="password123")

    def test_attendance_auto_calculation_present(self):
        from .models import Attendance
        today = datetime.date.today()
        att = Attendance.objects.create(
            user=self.user,
            date=today,
            check_in=datetime.time(9, 0),
            check_out=datetime.time(18, 0)
        )
        self.assertEqual(att.total_hours, 9.00)
        self.assertEqual(att.status, 'PRESENT')

    def test_attendance_auto_calculation_half_day(self):
        from .models import Attendance
        today = datetime.date.today()
        att = Attendance.objects.create(
            user=self.user,
            date=today,
            check_in=datetime.time(9, 0),
            check_out=datetime.time(14, 0)
        )
        self.assertEqual(att.total_hours, 5.00)
        self.assertEqual(att.status, 'HALF_DAY')

    def test_attendance_auto_calculation_absent(self):
        from .models import Attendance
        today = datetime.date.today()
        att = Attendance.objects.create(
            user=self.user,
            date=today,
            check_in=datetime.time(9, 0),
            check_out=datetime.time(11, 0)
        )
        self.assertEqual(att.total_hours, 2.00)
        self.assertEqual(att.status, 'ABSENT')

    def test_api_check_in_and_check_out(self):
        from django.urls import reverse
        # Check In API
        response_in = self.client.post(reverse('api_check_in'))
        self.assertEqual(response_in.status_code, 200)
        json_in = response_in.json()
        self.assertEqual(json_in['status'], 'success')
        self.assertIn('Successfully checked in', json_in['message'])

        # Check Out API
        response_out = self.client.post(reverse('api_check_out'))
        self.assertEqual(response_out.status_code, 200)
        json_out = response_out.json()
        self.assertEqual(json_out['status'], 'success')
        self.assertIn('Successfully checked out', json_out['message'])


class HREmployeeIntegrationTestCase(TestCase):
    def setUp(self):
        self.hr_user = User.objects.create_user(
            username="hr_manager",
            password="password123",
            role="HR",
            first_name="Sarah",
            last_name="Jenkins"
        )
        self.admin_user = User.objects.create_user(
            username="admin_user",
            password="password123",
            role="ADMIN"
        )
        self.emp1 = User.objects.create_user(
            username="john_doe",
            password="password123",
            role="EMPLOYEE",
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            department="Engineering",
            designation="Software Engineer"
        )
        self.emp2 = User.objects.create_user(
            username="jane_smith",
            password="password123",
            role="EMPLOYEE",
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com",
            department="Marketing",
            designation="Marketing Manager"
        )
        self.sick_leave = LeaveType.objects.create(name="Sick Leave", allocated_days=10, color_code="#ef4444")

    def test_hr_can_access_employee_directory(self):
        self.client.login(username="hr_manager", password="password123")
        from django.urls import reverse
        response = self.client.get(reverse("hr_employees"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "John Doe")
        self.assertContains(response, "Jane Smith")

    def test_hr_employee_search_and_filter(self):
        self.client.login(username="hr_manager", password="password123")
        from django.urls import reverse
        
        # Test search query for "John"
        res_search = self.client.get(reverse("hr_employees") + "?q=John")
        self.assertEqual(res_search.status_code, 200)
        self.assertContains(res_search, "John Doe")
        self.assertNotContains(res_search, "Jane Smith")

        # Test department filter for "Marketing"
        res_dept = self.client.get(reverse("hr_employees") + "?department=Marketing")
        self.assertEqual(res_dept.status_code, 200)
        self.assertContains(res_dept, "Jane Smith")
        self.assertNotContains(res_dept, "John Doe")

    def test_hr_employee_detail_view(self):
        self.client.login(username="hr_manager", password="password123")
        from django.urls import reverse
        response = self.client.get(reverse("hr_employee_detail", kwargs={"pk": self.emp1.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "John Doe")
        self.assertContains(response, "Engineering")
        self.assertContains(response, "Sick Leave")

    def test_regular_employee_denied_access(self):
        self.client.login(username="john_doe", password="password123")
        from django.urls import reverse
        
        res_dir = self.client.get(reverse("hr_employees"))
        self.assertRedirects(res_dir, reverse("employee_dashboard"))

        res_detail = self.client.get(reverse("hr_employee_detail", kwargs={"pk": self.emp2.pk}))
        self.assertRedirects(res_detail, reverse("employee_dashboard"))

    def test_hr_data_reuse_and_admin_sync(self):
        # Verify single source of truth: Admin changes employee department and leave balance
        self.emp1.department = "DevOps"
        self.emp1.save()

        bal = LeaveBalance.objects.get(user=self.emp1, leave_type=self.sick_leave)
        bal.used = 2
        bal.save()

        # HR views employee profile and sees updated data immediately
        self.client.login(username="hr_manager", password="password123")
        from django.urls import reverse
        response = self.client.get(reverse("hr_employee_detail", kwargs={"pk": self.emp1.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "DevOps")
        self.assertContains(response, "8 / 10 Days Remaining")


