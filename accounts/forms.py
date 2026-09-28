from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User

class CustomUserCreationForm(UserCreationForm):
    first_name = forms.CharField(max_length=30, required=True)
    last_name = forms.CharField(max_length=30, required=True)
    email = forms.EmailField(required=True)
    
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'role', 'department', 'designation', 'phone', 'gender', 'profile_pic', 'date_of_joining')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Apply glass-input style to all fields
        for field_name, field in self.fields.items():
            if field_name == 'profile_pic':
                field.widget.attrs.update({'class': 'form-control glass-input'})
            elif field_name == 'role' or field_name == 'gender':
                field.widget.attrs.update({'class': 'form-select glass-input'})
            elif field_name == 'date_of_joining':
                field.widget.attrs.update({'class': 'form-control glass-input', 'type': 'date'})
            else:
                field.widget.attrs.update({'class': 'form-control glass-input'})
                
        # Set placeholders
        self.fields['username'].widget.attrs.update({'placeholder': 'Username'})
        self.fields['email'].widget.attrs.update({'placeholder': 'Email Address'})
        self.fields['first_name'].widget.attrs.update({'placeholder': 'First Name'})
        self.fields['last_name'].widget.attrs.update({'placeholder': 'Last Name'})
        self.fields['department'].widget.attrs.update({'placeholder': 'e.g. IT, HR, Marketing'})
        self.fields['designation'].widget.attrs.update({'placeholder': 'e.g. Software Engineer'})
        self.fields['phone'].widget.attrs.update({'placeholder': 'Phone Number'})

class CustomUserChangeForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'department', 'designation', 'phone', 'gender', 'profile_pic')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name, field in self.fields.items():
            if field_name == 'profile_pic':
                field.widget.attrs.update({'class': 'form-control glass-input'})
            elif field_name == 'gender':
                field.widget.attrs.update({'class': 'form-select glass-input'})
            else:
                field.widget.attrs.update({'class': 'form-control glass-input'})
