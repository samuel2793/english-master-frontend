import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { HomeComponent } from './home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminPanelComponent } from './admin/admin-panel/admin-panel.component';
import { ActivityBrowserComponent } from './activities/activity-browser/activity-browser.component';
import { ExerciseListComponent } from './activities/exercise-list/exercise-list.component';
import { ExerciseViewerComponent } from './activities/exercise-viewer/exercise-viewer.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard]  // Protege la ruta home
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'admin',
    component: AdminPanelComponent,
    canActivate: [AuthGuard, AdminGuard]  // Solo admins autenticados
  },
  {
    path: 'activities/:course',
    component: ActivityBrowserComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'activities/:course/:level/:activity',
    component: ExerciseListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'activities/:course/:level/:activity/:exerciseId',
    component: ExerciseViewerComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/' } // Redirige al home si la ruta no existe
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
