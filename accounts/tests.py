from django.test import TestCase
from .models import User


class PublicNavigationTests(TestCase):
    def test_landing_page_links_to_registration_and_login(self):
        response = self.client.get('/')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="nav"')
        self.assertContains(response, 'href="/register/"')
        self.assertContains(response, 'href="/login/"')

    def test_registration_and_login_pages_are_available(self):
        self.assertEqual(self.client.get('/register/').status_code, 200)
        self.assertEqual(self.client.get('/login/').status_code, 200)

    def test_authenticated_visitors_still_see_the_landing_page_first(self):
        user = User.objects.create_user(username='employee', password='test-password-123')
        self.client.force_login(user)

        response = self.client.get('/')

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="nav"')
