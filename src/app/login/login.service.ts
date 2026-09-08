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
    // WMS backend responds { success, data: { token, user } } — not a bare { token }.
    return this.http.post<any>(AppSettings.API.login, values).pipe(
      map((res) => {
        const token = res?.data?.token;
        if (token) {
          sessionStorage.setItem('token', token);
          sessionStorage.setItem('user', JSON.stringify(res.data.user));
          this._isLoggedIn.next(true);
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