import { Component, isDevMode } from '@angular/core';
import { Router, RouterEvent } from '@angular/router';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {

    constructor(private router: Router) {
        if (isDevMode()) {
            router.events.pipe().subscribe(e => {
                console.log(e);
            });
        }
    }

    isActive(route: string): boolean {
        return this.router.isActive(route, false);
    }

    startOver(): void{
        if (window.confirm("Are you sure you want to start over? Unsaved progress will be lost.")){
            window.location.reload(true);
        }
    }
}
