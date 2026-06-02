function showMessage(text, type = 'success') {
    const existing = document.querySelector('.toast-message');
    if (existing) existing.remove();

    const msg = document.createElement('div');
    msg.className = 'toast-message toast-' + type;
    msg.textContent = text;
    document.body.appendChild(msg);

    setTimeout(function() {
        msg.classList.add('toast-show');
    }, 10);

    setTimeout(function() {
        msg.classList.remove('toast-show');
        setTimeout(function() {
            msg.remove();
        }, 300);
    }, 2500);
}