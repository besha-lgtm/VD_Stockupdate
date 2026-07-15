import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppSettings } from '../app.settings';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class LoginService {

  private _isLoggedIn = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this._isLoggedIn.asObservable();

  constructor(private http: HttpClient) {}

  private hasToken(): boolean {
    return !!sessionStorage.getItem('token');
  }

  login(values: any): Observable<any> {
    return this.http.post<any>(`${AppSettings.API_BASE_URL}/auth/login`, values).pipe(
      map((res) => {
        if (res?.token) {
          sessionStorage.setItem('token', res.token);
          this._isLoggedIn.next(true); // ✅ update state
        }
        return res;
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem('token');
    this._isLoggedIn.next(false);
  }

  token() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + sessionStorage.getItem('token'),
      }),
    };
  }

  isLoggedInSync(): boolean {
    return this._isLoggedIn.value;
  }
}