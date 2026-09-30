import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BOX_NUMBERS } from '../../../environments/environment';
import { BoxAccess } from '../../core/box/box-access';
import { Topbar } from '../../shared/topbar/topbar';

@Component({
  selector: 'app-praxis-boxes',
  imports: [RouterLink, Topbar],
  templateUrl: './praxis-boxes.html',
})
export class PraxisBoxes {
  protected readonly access = inject(BoxAccess);
  protected readonly boxes = BOX_NUMBERS;
}
