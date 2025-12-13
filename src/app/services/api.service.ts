import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class ApiService {
    constructor(private http: HttpClient) {}

    getData(): Observable<object> {
        return this.http.get<object>('/api/v1/devices/registry-schema')
    }

    sendData(data: any): Observable<any> {
        return this.http.post<any>('/api/v1/devices', data)
    }

    deleteDevice(deviceId: string): Observable<any> {
        return this.http.delete<any>(`/api/v1/devices/${deviceId}`)
    }

    getAllDevices(): Observable<any> {
        return this.http.get<any>('/api/v1/devices')
    }

    getSnapshots(tag: string): Observable<any> {
        return this.http.get<any>(`/api/v1/snapshots/${tag}`)
    }
}
