import '../css/index.css';

import { Application } from '@hotwired/stimulus';
import { registerControllers } from 'stimulus-vite-helpers';

const application = Application.start();
const controllers = import.meta.glob('./**/*_controller.js', { eager: true });
registerControllers(application, controllers);
