import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { UserSignup } from './user-signup';

describe('UserSignup', () => {
  let component: UserSignup;
  let fixture: ComponentFixture<UserSignup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSignup],
      providers: [provideRouter([]), provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserSignup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
