from django.urls import path
from . import views

urlpatterns = [
    path('', views.home_view, name='home'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('accounts/login/', views.login_view),
    path('accounts/logout/', views.logout_view),
    path('profile/', views.profile_view, name='profile'),
]

