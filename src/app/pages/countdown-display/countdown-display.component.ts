import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { trigger, state, style, transition, animate, query, stagger, keyframes } from '@angular/animations';
import { RestApiService } from '../../core/services/rest-api.service';
import { CountdownEvent } from '../../core/models/countdown-event.model';
import { interval, Subscription } from 'rxjs';
import Swiper from 'swiper';
import { Autoplay } from 'swiper/modules';

@Component({
  selector: 'app-countdown-display',
  templateUrl: './countdown-display.component.html',
  styleUrls: ['./countdown-display.component.scss'],
  animations: [
    // Event transition animation
    trigger('eventTransition', [
      state('in', style({ opacity: 1, transform: 'translateX(0) scale(1)' })),
      transition('void => *', [
        style({
          opacity: 0,
          transform: 'translateX(100px) scale(0.8)'
        }),
        animate('600ms cubic-bezier(0.35, 0, 0.25, 1)', style({
          opacity: 1,
          transform: 'translateX(0) scale(1)'
        }))
      ]),
      transition('* => void', [
        animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', style({
          opacity: 0,
          transform: 'translateX(-100px) scale(0.8)'
        }))
      ])
    ]),

    // Countdown units stagger animation
    trigger('countdownStagger', [
      transition('* => *', [
        query('.countdown-unit', [
          style({ opacity: 0, transform: 'translateY(30px) scale(0.8)' }),
          stagger(100, [
            animate('500ms cubic-bezier(0.35, 0, 0.25, 1)',
              style({ opacity: 1, transform: 'translateY(0) scale(1)' })
            )
          ])
        ], { optional: true })
      ])
    ]),

    // Timeline items animation
    trigger('timelineAnimation', [
      transition(':enter', [
        query('.tl-item', [
          style({ opacity: 0, transform: 'translateX(-50px)' }),
          stagger(50, [
            animate('400ms cubic-bezier(0.35, 0, 0.25, 1)',
              style({ opacity: 1, transform: 'translateX(0)' })
            )
          ])
        ], { optional: true })
      ])
    ]),

    // Floating animation for event image
    trigger('floatingImage', [
      transition('* => *', [
        animate('2000ms ease-in-out', keyframes([
          style({ transform: 'translateY(0px) rotate(0deg)', offset: 0 }),
          style({ transform: 'translateY(-10px) rotate(1deg)', offset: 0.5 }),
          style({ transform: 'translateY(0px) rotate(0deg)', offset: 1.0 })
        ]))
      ])
    ]),

    // Pulse animation for priority badges
    trigger('priorityPulse', [
      state('critical', style({ transform: 'scale(1)' })),
      state('urgent', style({ transform: 'scale(1)' })),
      transition('* => critical', [
        animate('1000ms ease-in-out', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.1)', offset: 0.5 }),
          style({ transform: 'scale(1)', offset: 1.0 })
        ]))
      ])
    ]),

    // Smooth number change animation
    trigger('numberChange', [
      transition('* => *', [
        style({ transform: 'scale(1.2)', opacity: 0.7 }),
        animate('300ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ])
    ]),

    // Events grid animation
    trigger('eventsGrid', [
      transition(':enter', [
        query('.event-card', [
          style({ opacity: 0, transform: 'translateY(50px) scale(0.8)' }),
          stagger(200, [
            animate('600ms cubic-bezier(0.35, 0, 0.25, 1)',
              style({ opacity: 1, transform: 'translateY(0) scale(1)' })
            )
          ])
        ], { optional: true })
      ])
    ]),

    // Individual event card animation
    trigger('eventCard', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px) scale(0.9)' }),
        animate('500ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' })
        )
      ])
    ]),

    // Carousel slide animation
    trigger('carouselSlide', [
      transition('* => *', [
        style({ opacity: 0.8 }),
        animate('800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          style({ opacity: 1 })
        )
      ])
    ])
  ]
})
export class CountdownDisplayComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('swiperContainer', { static: false }) swiperContainer!: ElementRef;
  swiper!: Swiper;

  events: CountdownEvent[] = [];
  currentEventIndex = 0;
  currentEvent: CountdownEvent | null = null;
  lastUpdateTime: Date = new Date();
  currentTime: Date = new Date();

  // Carousel properties
  currentSlideIndex = 0;
  eventsPerSlide = 3;
  carouselState = 'slide1';
  eventsGridState = 'loaded';
  carouselOffset = 0; // New property for smooth scrolling

  // Animation states
  eventAnimationState = 'in';
  countdownAnimationTrigger = 0;
  timelineAnimationTrigger = 0;
  imageAnimationTrigger = 0;

  // Previous countdown values for number change animation
  previousCountdown: any = {};

  // Zoom protection
  isZoomProtected = false;

  private rotationTimer?: any;
  private carouselTimer?: any;
  private countdownTimer?: Subscription;
  private dataRefreshTimer?: any;
  private clockTimer?: Subscription;

  // Display settings
  private readonly AUTO_ROTATION_ENABLED = true;
  private readonly CAROUSEL_AUTO_ROTATION_INTERVAL = 2000; // 5 seconds per slide for smoother experience
  private readonly COUNTDOWN_UPDATE_INTERVAL = 1000; // 1 second
  private readonly DATA_REFRESH_INTERVAL = 300000; // 5 minutes

  constructor(private restApiService: RestApiService) {}

  ngOnInit(): void {
    this.loadEvents();
    this.startCountdownTimer();
    this.startDataRefreshTimer();
    this.startClockTimer();
    this.detectZoomLevel();
    this.setupZoomDetection();
  }

  ngAfterViewInit(): void {
    if (this.events.length > 3) {
      this.initSwiper();
    }
  }

  ngOnDestroy(): void {
    this.stopRotation();
    this.stopCarouselRotation();
    this.stopCountdownTimer();
    this.stopDataRefreshTimer();
    this.stopClockTimer();

    if (this.swiper) {
      this.swiper.destroy(true, true);
    }
  }

  loadEvents(): void {
    this.restApiService.getCountdownEvents(60).subscribe({
      next: (response: any) => {
        console.log('Countdown API Response:', response);
        if (response && response.data) {
          this.events = response.data;
          this.currentEventIndex = 0;
          this.currentSlideIndex = 0;
          this.carouselOffset = 0;
          this.lastUpdateTime = new Date();

          console.log('Loaded events:', this.events);

          if (this.events.length > 0) {
            this.currentEvent = this.events[0];
            this.eventsGridState = 'loaded';
            this.carouselState = 'slide1';
            this.timelineAnimationTrigger++;
            this.countdownAnimationTrigger++;
            this.imageAnimationTrigger++;

            // Initialize Swiper for carousel mode (4+ events)
            if (this.events.length > 3) {
              setTimeout(() => {
                this.initSwiper();
              }, 100);
            }

            console.log('Current event set:', this.currentEvent);
          } else {
            console.log('No events found');
            this.currentEvent = null;
          }
        }
      },
      error: (error: any) => {
        console.error('Failed to load countdown events:', error);
      }
    });
  }

  private startClockTimer(): void {
    this.clockTimer = interval(1000).subscribe(() => {
      // This will trigger change detection for real-time clock
    });
  }

  private stopClockTimer(): void {
    if (this.clockTimer) {
      this.clockTimer.unsubscribe();
    }
  }

  private startRotation(): void {
    if (!this.AUTO_ROTATION_ENABLED || this.events.length <= 1) return;

    this.stopRotation();

    const currentEvent = this.events[this.currentEventIndex];
    const rotationDelay = (currentEvent?.displayDuration || 10) * 1000;

    this.rotationTimer = setTimeout(() => {
      this.nextEvent();
    }, rotationDelay);
  }

  private stopRotation(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = undefined;
    }
  }

  nextEvent(): void {
    if (this.events.length === 0) return;

    // Trigger exit animation
    this.eventAnimationState = 'out';

    setTimeout(() => {
      this.currentEventIndex = (this.currentEventIndex + 1) % this.events.length;
      this.currentEvent = this.events[this.currentEventIndex];

      // Reset animation triggers
      this.countdownAnimationTrigger++;
      this.imageAnimationTrigger++;

      // Trigger enter animation
      this.eventAnimationState = 'in';

      this.startRotation();
    }, 400); // Wait for exit animation to complete
  }

  previousEvent(): void {
    if (this.events.length === 0) return;

    // Trigger exit animation
    this.eventAnimationState = 'out';

    setTimeout(() => {
      this.currentEventIndex = this.currentEventIndex === 0
        ? this.events.length - 1
        : this.currentEventIndex - 1;
      this.currentEvent = this.events[this.currentEventIndex];

      // Reset animation triggers
      this.countdownAnimationTrigger++;
      this.imageAnimationTrigger++;

      // Trigger enter animation
      this.eventAnimationState = 'in';

      this.startRotation();
    }, 400); // Wait for exit animation to complete
  }

  private startCountdownTimer(): void {
    this.countdownTimer = interval(this.COUNTDOWN_UPDATE_INTERVAL).subscribe(() => {
      this.updateCountdowns();
    });
  }

  private stopCountdownTimer(): void {
    if (this.countdownTimer) {
      this.countdownTimer.unsubscribe();
    }
  }

  private startDataRefreshTimer(): void {
    this.dataRefreshTimer = setInterval(() => {
      this.loadEvents();
    }, this.DATA_REFRESH_INTERVAL);
  }

  private stopDataRefreshTimer(): void {
    if (this.dataRefreshTimer) {
      clearInterval(this.dataRefreshTimer);
      this.dataRefreshTimer = undefined;
    }
  }

  private updateCountdowns(): void {
    const now = new Date();

    this.events.forEach(event => {
      const eventDate = new Date(event.event_date);
      const timeDiff = eventDate.getTime() - now.getTime();

      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 3600 * 24));
        const hours = Math.floor((timeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
        const minutes = Math.floor((timeDiff % (1000 * 3600)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        event.countdown = {
          ...event.countdown,
          days,
          hours,
          minutes,
          seconds,
          isOverdue: false
        };
      } else {
        event.countdown.isOverdue = true;
      }
    });

    // Remove overdue events
    this.events = this.events.filter(event => !event.countdown.isOverdue);

    // Update current event if it was removed
    if (this.currentEvent && this.currentEvent.countdown.isOverdue) {
      if (this.events.length > 0) {
        this.currentEventIndex = this.currentEventIndex >= this.events.length
          ? 0
          : this.currentEventIndex;
        this.currentEvent = this.events[this.currentEventIndex];
      } else {
        this.currentEvent = null;
      }
    }
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  getEventImageUrl(imagePath?: string): string {
    if (!imagePath) {
      console.log('No image path provided');
      return '';
    }

    console.log('Original image path:', imagePath);

    // Handle Windows backslash paths from backend
    const normalizedPath = imagePath.replace(/\\/g, '/');
    console.log('Normalized path:', normalizedPath);

    let finalUrl = '';

    // Remove leading slash if exists, and ensure single forward slash
    const cleanPath = normalizedPath.replace(/^\/+/, '');

    // Build the final URL - baseUrl already has trailing slash
    finalUrl = `${this.restApiService.baseUrl}${cleanPath}`;

    console.log('Final image URL:', finalUrl);
    console.log('Base URL:', this.restApiService.baseUrl);

    return finalUrl;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  formatNumber(num: number): string {
    return num.toString().padStart(2, '0');
  }

  formatShortDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      'critical': 'Almost Here!',
      'urgent': 'Coming Soon!',
      'normal': 'This Month',
      'future': 'Coming Up'
    };
    return labels[priority] || 'Get Ready!';
  }

  getTimeBasedColor(event: CountdownEvent): string {
    const days = event.countdown.days;

    if (days > 40) {
      return 'time-safe'; // Hijau
    } else if (days >= 15) {
      return 'time-warning'; // Kuning
    } else {
      return 'time-urgent'; // Merah
    }
  }

  selectEvent(index: number): void {
    if (index >= 0 && index < this.events.length && index !== this.currentEventIndex) {
      // Trigger exit animation
      this.eventAnimationState = 'out';

      setTimeout(() => {
        this.currentEventIndex = index;
        this.currentEvent = this.events[index];

        // Reset animation triggers
        this.countdownAnimationTrigger++;
        this.imageAnimationTrigger++;

        // Trigger enter animation
        this.eventAnimationState = 'in';

        this.startRotation();
      }, 400); // Wait for exit animation to complete
    }
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  getLastUpdateTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  onImageLoad(event: any): void {
    console.log('Image loaded successfully:', event.target.src);
  }

  onImageError(event: any): void {
    console.error('Image failed to load:', event.target.src);
    console.error('Error event:', event);
  }

  getEventMonth(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  }

  getEventDay(dateString: string): string {
    const date = new Date(dateString);
    return date.getDate().toString();
  }

  private detectZoomLevel(): void {
    const zoomLevel = window.devicePixelRatio;
    this.isZoomProtected = zoomLevel > 1.2;

    // Also check viewport dimensions vs screen dimensions
    const viewportWidth = window.innerWidth;
    const screenWidth = window.screen.width;
    const ratio = screenWidth / viewportWidth;

    if (ratio > 1.3) {
      this.isZoomProtected = true;
    }
  }

  private setupZoomDetection(): void {
    // Listen for resize events that might indicate zoom changes
    window.addEventListener('resize', () => {
      setTimeout(() => {
        this.detectZoomLevel();
      }, 100);
    });

    // Listen for wheel events with ctrl key (zoom shortcut)
    window.addEventListener('wheel', (event) => {
      if (event.ctrlKey) {
        setTimeout(() => {
          this.detectZoomLevel();
        }, 200);
      }
    });

    // Listen for keyboard zoom shortcuts
    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '-' || event.key === '0')) {
        setTimeout(() => {
          this.detectZoomLevel();
        }, 200);
      }
    });
  }

  // Swiper initialization for infinite carousel
  private initSwiper(): void {
    if (!this.swiperContainer) {
      return;
    }

    // Configure Swiper modules
    Swiper.use([Autoplay]);

    this.swiper = new Swiper(this.swiperContainer.nativeElement, {
      modules: [Autoplay], // Remove Navigation and Pagination modules
      slidesPerView: 3,
      spaceBetween: 20,
      centeredSlides: false,
      loop: true, // This enables infinite loop
      autoplay: {
        delay: 5000, // 5 seconds
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      speed: 800, // Smooth transition
      breakpoints: {
        320: {
          slidesPerView: 1,
          spaceBetween: 10
        },
        768: {
          slidesPerView: 2,
          spaceBetween: 15
        },
        1024: {
          slidesPerView: 3,
          spaceBetween: 20
        }
      },
      on: {
        slideChange: () => {
          console.log('Swiper slide changed');
        }
      }
    });
  }

  // Carousel auto-rotation methods
  private startCarouselRotation(): void {
    if (!this.AUTO_ROTATION_ENABLED || this.events.length <= 3) {
      return;
    }

    this.stopCarouselRotation();

    this.carouselTimer = setInterval(() => {
      if (this.events.length > 3) {
        // Always increment offset (never go backward)
        this.carouselOffset++;

        // When we reach the end of original events, seamlessly reset to start
        // This creates infinite loop effect
        if (this.carouselOffset >= this.events.length) {
          // Temporarily disable transition for seamless reset
          this.carouselState = 'resetting';
          setTimeout(() => {
            this.carouselOffset = 0;
            this.carouselState = `offset${this.carouselOffset}`;
          }, 50);
        } else {
          // Normal transition
          this.carouselState = `offset${this.carouselOffset}`;
        }

        console.log(`Auto-scrolling carousel, offset: ${this.carouselOffset}, total events: ${this.events.length}`);
      }
    }, this.CAROUSEL_AUTO_ROTATION_INTERVAL);
  }

  private stopCarouselRotation(): void {
    if (this.carouselTimer) {
      clearInterval(this.carouselTimer);
      this.carouselTimer = undefined;
    }
  }

  // Pause/Resume carousel on hover
  pauseCarousel(): void {
    this.stopCarouselRotation();
  }

  resumeCarousel(): void {
    this.startCarouselRotation();
  }

  // Carousel methods for 4+ events
  getTotalSlides(): number {
    return Math.ceil(this.events.length / this.eventsPerSlide);
  }

  getVisibleEvents(): CountdownEvent[] {
    if (this.events.length <= 3) {
      return this.events;
    }

    // Create a longer track for seamless scrolling
    // Duplicate events 3 times to ensure smooth infinite loop
    const extendedEvents = [...this.events, ...this.events, ...this.events];
    return extendedEvents;
  }

  nextSlide(): void {
    if (this.events.length > 3) {
      this.carouselOffset++;

      // Reset seamlessly when reaching end
      if (this.carouselOffset >= this.events.length) {
        this.carouselState = 'resetting';
        setTimeout(() => {
          this.carouselOffset = 0;
          this.carouselState = `offset${this.carouselOffset}`;
        }, 50);
      } else {
        this.carouselState = `offset${this.carouselOffset}`;
      }

      // Restart auto-rotation after manual interaction
      this.startCarouselRotation();
    }
  }

  previousSlide(): void {
    // For continuous forward-only carousel, previous = next
    this.nextSlide();
  }

  isFirstSlide(): boolean {
    return this.carouselOffset === 0;
  }

  isLastSlide(): boolean {
    return this.carouselOffset === this.events.length - 1;
  }

  getCarouselTransform(): string {
    if (this.events.length <= 3) {
      return 'translateX(0%)';
    }

    // Calculate transform based on card width in 300% wide track
    // Each card is 11.111% of track width, so moving by one card = 11.111%
    const cardWidthPercent = 11.111; // Each card in 300% track
    const translateX = -(this.carouselOffset * cardWidthPercent);
    return `translateX(${translateX}%)`;
  }
}
