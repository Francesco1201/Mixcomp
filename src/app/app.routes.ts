import { Routes } from '@angular/router';
import {ComparatorComponent} from './features/comparator/comparator.component';


export const routes: Routes = [
  {
    path: '',
    redirectTo: 'comparator',
    pathMatch: 'full'
  },
  {
    path: 'comparator',
    component: ComparatorComponent,
  },
  {
    path: '**',
    component: ComparatorComponent,
  },
];
