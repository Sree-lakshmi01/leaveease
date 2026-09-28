from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate, update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import CustomUserCreationForm, CustomUserChangeForm
from django.contrib.auth.forms import AuthenticationForm

def home_view(request):
    """Public landing page shown first for every visitor."""
    return render(request, 'index.html')

def register_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
        
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST, request.FILES)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, f"Registration successful! Welcome, {user.username}.")
            return redirect('dashboard')
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = CustomUserCreationForm()
    return render(request, 'register.html', {'form': form})

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
        
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                messages.success(request, f"Welcome back, {user.first_name or user.username}!")
                return redirect('dashboard')
        else:
            messages.error(request, "Invalid username or password.")
    else:
        form = AuthenticationForm()
    return render(request, 'login.html', {'form': form})

def logout_view(request):
    logout(request)
    messages.info(request, "You have been logged out successfully.")
    return redirect('login')

@login_required
def profile_view(request):
    if request.method == 'POST':
        if 'update_profile' in request.POST:
            form = CustomUserChangeForm(request.POST, request.FILES, instance=request.user)
            password_form = PasswordChangeForm(request.user)
            if form.is_valid():
                form.save()
                messages.success(request, "Your profile details have been updated successfully.")
                return redirect('profile')
            else:
                messages.error(request, "Error updating profile. Please verify your entries.")
        elif 'change_password' in request.POST:
            form = CustomUserChangeForm(instance=request.user)
            password_form = PasswordChangeForm(request.user, request.POST)
            if password_form.is_valid():
                user = password_form.save()
                update_session_auth_hash(request, user)  # Keep user logged in
                messages.success(request, "Your password has been changed successfully.")
                return redirect('profile')
            else:
                messages.error(request, "Error changing password. Please correct the fields below.")
    else:
        form = CustomUserChangeForm(instance=request.user)
        password_form = PasswordChangeForm(request.user)
        
    # Get leave balances to display on profile for Employee
    balances = None
    if request.user.role == 'EMPLOYEE':
        balances = request.user.balances.all().select_related('leave_type')
        
    context = {
        'form': form,
        'password_form': password_form,
        'balances': balances
    }
    return render(request, 'accounts/profile.html', context)
