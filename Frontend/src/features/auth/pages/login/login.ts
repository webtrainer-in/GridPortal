import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    ButtonModule, 
    InputTextModule, 
    PasswordModule,
    MessageModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['admin@gridportal.com', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const { email, password } = this.loginForm.value;

      // Simple validation (replace with actual API call in production)
      setTimeout(() => {
        if (email === 'admin@gridportal.com' && password === 'admin123') {
          // Store login state in localStorage (replace with proper token handling)
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userEmail', email);
          
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set('Invalid email or password. Please try again.');
        }
        this.isLoading.set(false);
      }, 1000);
    } else {
      this.markFormGroupTouched();
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field && field.invalid && field.touched) {
      if (field.errors?.['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors?.['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors?.['minlength']) {
        return 'Password must be at least 6 characters long';
      }
    }
    return '';
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  clearForm() {
    this.loginForm.reset({
      email: 'admin@gridportal.com',
      password: ''
    });
    this.errorMessage.set('');
  }
}
