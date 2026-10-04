import { Application } from '@hotwired/stimulus';

import HomeController from './home_controller.js';
import SearchCardController from './search_card_controller.js';

const application = Application.start();

application.register('home', HomeController);
application.register('search-card', SearchCardController);
