import { TOAST_TYPES } from "./constants";

class Components {


    appContainer: HTMLElement | null;
    spinnerComponent: HTMLElement | null;
    toastComponent: HTMLElement | null; 
    toastTitle: HTMLElement  | null;
    toastMessage: HTMLElement  | null;
    toastIcon: HTMLElement  | null;
    toastTimeout: ReturnType<typeof setTimeout> | null;
    constructor() {
        this.appContainer = null;
         this.spinnerComponent = null;
         this.toastComponent = null;
         this.toastTitle = null;
         this.toastMessage = null;
         this.toastIcon = null;
         this.toastTimeout = null;
    }

    init(appContainer: HTMLElement): void { 
        this.appContainer = appContainer; 
        this.toastComponent = document.getElementById('toastComponent');
        this.spinnerComponent = document.getElementById('spinnerComponent');
        this.toastTitle = document.getElementById('toastTitle');
        this.toastMessage = document.getElementById('toastMsg');
        this.toastIcon = document.getElementById('toastIcon');
        this.hideSpinner();
    }
    
    showToast(type : string, title : string, message : string, duration = 5000){
        if (!this.toastComponent || !this.toastTitle || !this.toastMessage || !this.toastIcon) {
    
            this.toastComponent = this.toastComponent || document.getElementById('toastComponent');
            this.toastTitle = this.toastTitle || document.getElementById('toastTitle');
            this.toastMessage = this.toastMessage || document.getElementById('toastMsg');
            this.toastIcon = this.toastIcon || document.querySelector('.toastIcon');

            if (!this.toastComponent || !this.toastTitle || !this.toastMessage || !this.toastIcon) {
                console.error('Toast component or its elements not found');
                return;
            }

        }

        if (this.toastTimeout){
            clearTimeout(this.toastTimeout);    
        }

        this.toastComponent.classList.remove('toast-error', 'toast-warning', 'toast-success', 'toast-info, hide');
        if (TOAST_TYPES.includes(type)){
            this.toastComponent.classList.add(`toast-${type}`);
        }else {
            this.toastComponent.classList.add('toast-error');
        }

        let iconClass: string | null;
        switch (type) {
            case 'error':
                iconClass = 'bi-exclamation-triangle-fill';
                break;
            case 'warning':
                iconClass = 'bi-exclamation-circle-fill';
                break;
            case 'success':
                iconClass = 'bi-check-circle-fill';
                break;
            case 'info':
                iconClass = 'bi-info-circle-fill';
                break;
            default:
                iconClass = 'bi-exclamation-triangle-fill';
        }
        this.toastIcon!.className = `bi ${iconClass}; toast-icon`;
        this.toastTitle!.textContent= title;
        this.toastMessage!.textContent= message;
        this.toastComponent!.classList.remove('d-none');

            this.toastTimeout = setTimeout(() => {
               this.hideToast();
            }, duration); 
        }
    
        hideToast() {
            if (!this.toastComponent) {
                this.toastComponent = document.getElementById('toastComponent');
            }
            if (this.toastComponent) {
                this.toastComponent.classList.add('hide');
                setTimeout(() => {
                    this.toastComponent!.classList.add('d-none');
                    this.toastComponent!.classList.remove('hide');
                }, 300);
            }
        }

        showSpinner(): void {
            if (!this.spinnerComponent) {
                this.spinnerComponent = document.getElementById('spinnerComponent');
            }
            if (this.spinnerComponent) {
                this.spinnerComponent.classList.remove('d-none');
            }
        }
        
        hideSpinner(): void {
            if (!this.spinnerComponent) {
                this.spinnerComponent = document.getElementById('spinnerComponent');
            }
            if (this.spinnerComponent) {
                this.spinnerComponent.classList.add('d-none');
            }
        }

}

const components = new Components();
export default components;