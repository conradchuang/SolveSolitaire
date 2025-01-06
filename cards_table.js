// vim: set ai et sw=4 sts=4:

const CardHeight = 100;
const CardHeightUnit = "px";
const CardDir = "images";
const CardJoker = "black_joker.png";
const CardBack = "card back green.png";
const Suits = ["spades", "hearts", "diamonds", "clubs"];
const Ranks = ["ace", "king", "queen", "jack",
               "10", "9", "8", "7", "6", "5", "4", "3", "2"];
var _card_map;

function cards_table_init() {
    let ss = document.createElement("style");
    document.head.appendChild(ss);
    ss.sheet.insertRule(".card-img { height: " + CardHeight +
                        CardHeightUnit + "; border-radius: 0.25rem; }");
    ss.sheet.insertRule(".small-card-img { height: " + (CardHeight * 2 / 3) +
                        CardHeightUnit + "; border-radius: 0.25rem; }");
}

function _dragstart_handler(ev) {
    let img = ev.target;
    if (img.getAttribute("data-used")) {
        ev.preventDefault();
        alert("Card is already used");
        return;
    }
    ev.dataTransfer.dropEffect = "move";
    ev.dataTransfer.setData("rank", img.getAttribute("data-rank"));
    ev.dataTransfer.setData("suit", img.getAttribute("data-suit"));
}

function _card_key(rank, suit) {
    return suit + "-" + rank;
}

function cards_table_gen() {
    _card_map = {}
    let table = document.createElement("table");
    table.className = "cards-table";
    for (let si = 0; si < Suits.length; si++) {
        let row = document.createElement("tr");
        row.className = "cards-row";
        table.appendChild(row);
        let suit = Suits[si];
        for (let ri = 0; ri < Ranks.length; ri++) {
            let cell = document.createElement("td");
            cell.className = "cards-cell";
            row.appendChild(cell);
            let img = document.createElement("img");
            img.className = "small-card-img";
            // img.draggable = true;
            let rank = Ranks[ri];
            img.src = card_img_url(rank, suit);
            img.setAttribute("data-rank", rank)
            img.setAttribute("data-suit", suit)
            img.setAttribute("data-used", "")
            img.addEventListener("dragstart", _dragstart_handler);
            _card_map[_card_key(rank, suit)] = img;
            cell.appendChild(img);
        }
    }
    return table;
}

function card_img_url(rank, suit) {
    return CardDir + "/" + rank + "_of_" + suit + ".png";
}

function card_back_url() {
    return CardDir + "/" + CardBack;
}

function card_joker_url() {
    return CardDir + "/" + CardJoker;
}

function card_used(rank, suit, used) {
    // console.log("card_used: " + suit + " " + rank + " " + used);
    let img = _card_map[_card_key(rank, suit)];
    // console.log(img);
    if (used) {
        img.src = card_back_url();
        img.setAttribute("data-used", "used");
    } else {
        img.src = card_img_url(rank, suit);
        img.setAttribute("data-used", "");
    }
}
