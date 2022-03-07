import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { LoadConfigComponent } from './load-config/load-config.component';
import { ExportConfigComponent } from './export-config/export-config.component';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { LoadConfigCsvComponent } from './load-config-csv/load-config-csv.component';
import { LoadConfigTxtComponent } from './load-config-txt/load-config-txt.component';
import { LoadConfigEmptyComponent } from './load-config-empty/load-config-empty.component';
import { LicenseInfoComponent } from './license-info/license-info.component';
import { GcpsMapComponent } from './gcps-map/gcps-map.component';
import { ImagesTaggerComponent } from './images-tagger/images-tagger.component';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { SmartimageComponent } from './smartimage/smartimage.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { NgOpenCVModule, OpenCVOptions } from "ng-open-cv";

const openCVConfig: OpenCVOptions = {
    scriptUrl: `assets/opencv/opencv.js`,
    wasmBinaryFile: 'wasm/opencv_js.wasm',
    usingWasm: true
};

@NgModule({
    declarations: [
        AppComponent,
        LoadConfigComponent,
        ExportConfigComponent,
        LoadConfigCsvComponent,
        LoadConfigTxtComponent,
        LoadConfigEmptyComponent,
        GcpsMapComponent,
        ImagesTaggerComponent,
        SmartimageComponent,
        LicenseInfoComponent,
        ConfirmDialogComponent
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        NgbModule,
        FontAwesomeModule,
        FormsModule,
        LeafletModule.forRoot(),
        NgOpenCVModule.forRoot(openCVConfig),
    ],
    providers: [
        {
            provide: LocationStrategy,
            useClass: HashLocationStrategy
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
    constructor(library: FaIconLibrary) {
        library.addIconPacks(fas, far);
    }
}
