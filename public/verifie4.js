
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

const h1Element = document.querySelector('h1');
const iconElement = document.querySelector('.icon-circle');
const iconInner = iconElement.querySelector('i');

if (token) {
    console.log("Verifierar token: " + token);
    
    fetch('/api/verify?token=' + token)
        .then(response => {
            if (response.ok) {

                h1Element.innerText = "Grattis du har verifierat ditt konto";
            } else {

                visaFelmeddelande("Länken är ogiltig eller har gått ut.");
            }
        })
        .catch(error => {

            console.error("Fel vid verifiering:", error);
            visaFelmeddelande("Ett tekniskt fel uppstod. Försök igen senare.");
        });
} else {

    visaFelmeddelande("Ingen verifieringskod hittades.");
}

function visaFelmeddelande(meddelande) {
    h1Element.innerText = meddelande;
    iconElement.style.borderColor = "#ff4d4d"; 
    iconInner.style.color = "#ff4d4d";       
    iconInner.className = "fa-solid fa-xmark"; 
}