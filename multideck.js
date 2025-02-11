// vim: set ai et sw=4 sts=4:

const CardHeight = 6.5;
const CardHeightUnit = "rem";
const CardDir = "images";
const CardWell = "clear.png";
const CardBack = "card back green.png";
const Suits = ["spades", "hearts", "diamonds", "clubs"];
const Ranks = ["ace", "king", "queen", "jack",
               "10", "9", "8", "7", "6", "5", "4", "3", "2"];
var suit_count;
var _card_map;

function cards_table_init(counts) {
    suit_count = counts;
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
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.dropEffect = "move";
    ev.dataTransfer.setData("rank", img.getAttribute("data-rank"));
    ev.dataTransfer.setData("suit", img.getAttribute("data-suit"));
    ev.dataTransfer.setData("key", img.getAttribute("data-key"));
}

function card_key(rank, suit, index) {
    return suit + "-" + rank + "-" + index;
}

function card_key_decode(key) {
    let parts = key.split("-");
    return { suit: parts[0],
             rank: parts[1],
             index: parts[2] };
}

function _add_row(table) {
    let row = document.createElement("tr");
    row.className = "cards-row";
    table.appendChild(row);
    return row;
}

function _add_suit(div, row, offset, half_width, suit, index) {
    let top = (CardHeight * 1.25 * row).toFixed(2) + CardHeightUnit;
    for (let ri = 0; ri < Ranks.length; ri++) {
        let img = document.createElement("img");
        img.classList.add("cards-position");
        img.classList.add("card-img");
        let left = (offset + ri) * half_width;
        img.style.left = (left * 100).toFixed(2) + "%";
        img.style.top = top;
        img.draggable = true;
        let rank = Ranks[ri];
        let key = card_key(rank, suit, index);
        img.src = card_img_url(rank, suit);
        img.setAttribute("data-rank", rank)
        img.setAttribute("data-suit", suit)
        img.setAttribute("data-key", key)
        img.setAttribute("data-used", "")
        img.addEventListener("dragstart", _dragstart_handler);
        _card_map[key] = img;
        div.appendChild(img);
    }
}

function cards_table_gen() {
    _card_map = {}
    let div = document.createElement("div");
    let num_suits = 0;
    for (let suit in suit_count)
        num_suits += suit_count[suit];
    let num_rows = num_suits / 2;       // 2 suits per row
    let h = num_rows + 0.25 * (num_rows - 1);
    div.style.height = (CardHeight * h).toFixed(2) + CardHeightUnit;
    // The half width of a card is computed by assuming that the
    // cards (actually the full width occupied by a card including
    // horizontal space on either side) overlap by 50%.
    // So a single suit will have 1 card showing completely and
    // 12 others showing half, for a total of 14 half cards.
    // Since we want to put 2 suits per row, we also need to leave a
    // half-card gap between the suits, yielding a total of 29 half cards.
    // The cards are positioned at the center of their assigned
    // space and css translates the card leftward by 50%.  So the
    // first suit starts at offset 1 and its last card is at
    // offset 13.  Offset 14 is the right half of the last card;
    // offset 15 is the gap between suits.  So the second suit
    // starts at offset 16.
    let half_width = 1 / 29;    // As a fraction, not percent
    div.className = "cards-div";
    let row = 0;
    let col = 0;
    let offsets = [1, 16];
    for (let suit of Suits) {
        for (let index = 0; index < suit_count[suit]; index++) {
            _add_suit(div, row, offsets[col], half_width, suit, index);
            col++;
            if (col >= offsets.length) {
                col = 0;
                row++;
            }
        }
    }
    return div;
}

function card_img_url(rank, suit) {
    return CardDir + "/" + rank + "_of_" + suit + ".png";
}

function card_back_url() {
    return CardDir + "/" + CardBack;
}

function card_well_url() {
    return CardDir + "/" + CardWell;
}

function card_used(key, used) {
    // console.log("card_used: " + key);
    let img = _card_map[key];
    // console.log(img);
    if (used) {
        img.src = card_back_url();
        img.setAttribute("data-used", "used");
    } else {
        let p = card_key_decode(key);
        img.src = card_img_url(p.rank, p.suit);
        img.setAttribute("data-used", "");
    }
}
