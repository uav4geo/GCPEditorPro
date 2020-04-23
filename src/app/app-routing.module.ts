import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoadConfigComponent } from './load-config/load-config.component';
import { ExportConfigComponent } from './export-config/export-config.component';
import { ImagesTaggerComponent } from './images-tagger/images-tagger.component';
import { GcpsMapComponent } from './gcps-map/gcps-map.component';

const routes: Routes = [
  { path: 'load-config', component: LoadConfigComponent },
  { path: 'images-tagger/:gcp', component: ImagesTaggerComponent },
  { path: 'gcps-map', component: GcpsMapComponent },
  { path: 'export-config', component: ExportConfigComponent },
  {
    path: '',
    redirectTo: '/load-config',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/load-config'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
