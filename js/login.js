const STORAGE_KEY_LOGGED = 'logged';
const STORAGE_KEY_TOKEN = 'authToken';
const STORAGE_KEY_TOKEN_EXPIRES = 'authExpiresAt';
const STORAGE_KEY_USERNAME = 'authUsername';
const STORAGE_KEY_LOGOUT_REASON = 'logoutReason';
const LOGOUT_REASON_EXPIRED = 'expired';
const LOGIN_PAGE = '/login.html';

const isLoginPage = window.location.pathname === LOGIN_PAGE || window.location.pathname === '/login';

const setLoginState = isLogged => {
    sessionStorage.setItem(STORAGE_KEY_LOGGED, isLogged ? 'true' : 'false');
};

const setAuthToken = token => {
    sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
};

const setTokenExpiration = expiresAt => {
    sessionStorage.setItem(STORAGE_KEY_TOKEN_EXPIRES, expiresAt);
};

const clearSessionStorage = preserveLogoutReason => {
    sessionStorage.removeItem(STORAGE_KEY_LOGGED);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRES);
    sessionStorage.removeItem(STORAGE_KEY_USERNAME);

    if (!preserveLogoutReason) {
        sessionStorage.removeItem(STORAGE_KEY_LOGOUT_REASON);
    }
};

const logout = (reason, preserveLogoutReason = false) => {
    if (reason === LOGOUT_REASON_EXPIRED) {
        sessionStorage.setItem(STORAGE_KEY_LOGOUT_REASON, LOGOUT_REASON_EXPIRED);
        preserveLogoutReason = true;
    }

    clearSessionStorage(preserveLogoutReason);
    window.location.replace(LOGIN_PAGE);
};

const getSessionData = () => ({
    logged: sessionStorage.getItem(STORAGE_KEY_LOGGED),
    token: sessionStorage.getItem(STORAGE_KEY_TOKEN),
    tokenExpiresAt: sessionStorage.getItem(STORAGE_KEY_TOKEN_EXPIRES)
});

const parseExpirationTime = expiresAt => Date.parse(expiresAt || '');

const scheduleLogout = expiresAt => {
    const expirationTime = parseExpirationTime(expiresAt);
    const now = Date.now();
    const timeLeft = expirationTime - now;

    if (Number.isNaN(expirationTime) || now >= expirationTime) {
        logout(LOGOUT_REASON_EXPIRED);
        return;
    }

    window.setTimeout(() => logout(LOGOUT_REASON_EXPIRED), timeLeft);
};

const initializeSessionCheck = () => {
    if (isLoginPage) {
        return;
    }

    const session = getSessionData();
    const expirationTime = parseExpirationTime(session.tokenExpiresAt);

    if (
        session.logged !== 'true' ||
        !session.token ||
        !session.tokenExpiresAt ||
        Number.isNaN(expirationTime) ||
        Date.now() >= expirationTime
    ) {
        logout(Date.now() >= expirationTime ? LOGOUT_REASON_EXPIRED : undefined);
        return;
    }

    scheduleLogout(session.tokenExpiresAt);
};

const showLogoutReasonOnLogin = messageP => {
    if (!messageP) {
        return;
    }

    const logoutReason = sessionStorage.getItem(STORAGE_KEY_LOGOUT_REASON);

    if (logoutReason === LOGOUT_REASON_EXPIRED) {
        messageP.textContent = 'Sesija je istekla. Prijavite se ponovo.';
    }

    sessionStorage.removeItem(STORAGE_KEY_LOGOUT_REASON);
};

const initializeLoginForm = () => {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('pwd');
    const form = document.getElementById('login-form');
    const messageP = document.getElementById('poruka');

    showLogoutReasonOnLogin(messageP);

    if (!form) {
        return;
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const username = (usernameInput?.value || '').trim();
        const password = passwordInput?.value || '';

        if (!username && !password) {
            messageP.textContent = 'Obavezno je uneti korisničko ime i lozinku.';
            return;
        }

        if (!username) {
            messageP.textContent = 'Obavezno je uneti korisničko ime.';
            return;
        }

        if (!password) {
            messageP.textContent = 'Obavezno je uneti lozinku.';
            return;
        }

        try {
            const data = await window.apiClient.login(username, password);

            if (data.token) {
                setLoginState(true);
                setAuthToken(data.token);
                setTokenExpiration(data.expiresAt);
                sessionStorage.setItem(STORAGE_KEY_USERNAME, username);
                sessionStorage.removeItem(STORAGE_KEY_LOGOUT_REASON);
                scheduleLogout(data.expiresAt);
                messageP.textContent = 'Prijava uspešna. Dobrodošli!';
                return;
            }

            setLoginState(false);
            sessionStorage.removeItem(STORAGE_KEY_TOKEN);
            sessionStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRES);
            sessionStorage.removeItem(STORAGE_KEY_USERNAME);
            sessionStorage.removeItem(STORAGE_KEY_LOGOUT_REASON);
            messageP.textContent = data.error || data.message || 'Prijava nije uspela.';
        } catch (error) {
            setLoginState(false);
            sessionStorage.removeItem(STORAGE_KEY_TOKEN);
            sessionStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRES);
            sessionStorage.removeItem(STORAGE_KEY_USERNAME);
            sessionStorage.removeItem(STORAGE_KEY_LOGOUT_REASON);
            messageP.textContent = error.message || 'Došlo je do greške. Pokušajte ponovo.';
        }
    });
};

const initializeResponsiveNavigation = () => {
    const navigationToggle = document.querySelector('.navbar .toggle');
    const navigation = document.getElementById('primary-navigation');

    if (!navigationToggle || !navigation) {
        return;
    }

    const closeNavigation = () => {
        navigationToggle.setAttribute('aria-expanded', 'false');
        navigationToggle.setAttribute('aria-label', 'Prikaži navigaciju');
    };

    navigationToggle.addEventListener('click', () => {
        const expanded = navigationToggle.getAttribute('aria-expanded') !== 'true';
        navigationToggle.setAttribute('aria-expanded', String(expanded));
        navigationToggle.setAttribute('aria-label', expanded ? 'Sakrij navigaciju' : 'Prikaži navigaciju');
    });

    navigation.addEventListener('click', event => {
        if (event.target.closest('a')) {
            closeNavigation();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeNavigation();
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    initializeSessionCheck();
    initializeLoginForm();
    initializeResponsiveNavigation();
});
