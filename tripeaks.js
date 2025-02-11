// vim: set ai et sw=4 sts=4:

const PyramidPositions = [
    [3, 0], [3, 3], [3, 6],
    [2, 0], [2, 1], [2, 3], [2, 4], [2, 6], [2, 7],
    [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
    [1, 5], [1, 6], [1, 7], [1, 8],
    [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
    [0, 6], [0, 7], [0, 8], [0, 9],
];
var PyramidKeys = new Set();
const StackSize = 24;
var assigned_positions = 0;
var player_controls = null;

//=============================================================================
// UI
//=============================================================================

function position_assign(img, rank, suit) {
    img.setAttribute("data-rank", rank);
    img.setAttribute("data-suit", suit);
    img.src = card_img_url(rank, suit);
    card_used(rank, suit, true);
    assigned_positions++;
    document.getElementById("solve").disabled = assigned_positions != 52;
}

function position_cancel(img, rank, suit) {
    img.setAttribute("data-rank", "");
    img.setAttribute("data-suit", "");
    img.src = card_back_url();
    card_used(rank, suit, false);
    assigned_positions--
    document.getElementById("solve").disabled = assigned_positions != 52;
}

function _cancel_handler(ev) {
    ev.preventDefault();
}

function _drop_handler(ev) {
    ev.preventDefault();
    let img = ev.target;
    let rank = ev.dataTransfer.getData("rank");
    let suit = ev.dataTransfer.getData("suit");
    let orig_rank = img.getAttribute("data-rank");
    if (orig_rank) {
        alert("Position is already assigned");
        return;
    }
    position_assign(img, rank, suit);
}

function _click_handler(ev) {
    ev.preventDefault();
    let img = ev.target;
    let rank = img.getAttribute("data-rank");
    if (!rank) {
        // Silently ignore request.  Alert was too irritating.
        // alert("Position is not assigned yet");
        return;
    }
    let suit = img.getAttribute("data-suit");
    position_cancel(img, rank, suit);
}

function tripeaks_gen() {
    let container = document.createElement("div");
    let div = document.createElement("div");
    div.classList.add("tripeaks-div");
    div.style.height = ((3 / 2 + 1) * CardHeight).toFixed(2) + CardHeightUnit;
    add_card_row(div, [0, 3, 6], 3, 0);
    add_card_row(div, [0, 1, 3, 4, 6, 7], 2, 1);
    add_card_row(div, [0, 1, 2, 3, 4, 5, 6, 7, 8], 1, 2);
    add_card_row(div, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 0, 3);
    container.appendChild(div);
    let stack = document.createElement("div");
    stack.classList.add("tripeaks-div");
    stack.style.marginTop = "1rem";
    let num_rows = 1;
    stack.style.height = (num_rows * CardHeight).toFixed(2) + CardHeightUnit;
    add_card_stack(stack, StackSize, num_rows);
    container.appendChild(stack);
    add_transition_card(container);
    return container;
}

function add_card_row(div, xoffsets, yoffset, row) {
    // The cards are arranged on a rectilinear grid
    // In all rows, the cards are the same distance apart horizontally
    // The widest (bottom-most) row has 10 cards
    // The higher in the pyramid the row, the farther right is the first card
    let card_width = 1 / 10
    let left_base = (yoffset / 2 + 0.5) * card_width
    for (let i = 0; i < xoffsets.length; i++) {
        let img = document.createElement("img");
        img.draggable = false;
        img.setAttribute("data-col", xoffsets[i]);
        img.setAttribute("data-row", yoffset);
        img.setAttribute("data-rank", "");
        img.setAttribute("data-suit", "");
        img.classList.add("card-img");
        img.classList.add("tripeaks-card");
        img.classList.add("tripeaks-center");
        let left = left_base + card_width * xoffsets[i]
        img.style.left = (left * 100).toFixed(2) + "%";
        img.style.top = (CardHeight * (row / 2)).toFixed(2) + CardHeightUnit;
        img.src = card_back_url();
        img.addEventListener("click", _click_handler);
        img.addEventListener("drop", _drop_handler);
        img.addEventListener("dragenter", _cancel_handler);
        img.addEventListener("dragover", _cancel_handler);
        div.appendChild(img);
    }
}

function add_card_stack(div, num_cards, num_rows) {
    // The cards are arranged in rows.
    // We compute the maximum number of cards per row.
    // For each row, we overlap the cards by 50%, so for N cards,
    // there are a total of (N+1) half-cards.
    // We also leave space for the waste pile, which is the same
    // width as a full card and separated from the stack by a half-card gap.
    // So there is a total of (cards_per_row + 4) half-card spaces in a row.
    // Note that the space for each card is not necessarily the same as the
    // width of the card image.  To compensate, we set the x position for
    // each card to the middle of the space and depend on CSS to translate
    // the card 50% to the left.  This places each card at the center of
    // its space and guarantees even spacing throughout.

    // Compute positioning parameters
    let remainder = num_cards % num_rows;
    let cards_per_row = 0;
    if (remainder == 0)
        cards_per_row = num_cards / num_rows;
    else
        cards_per_row = (num_cards - remainder) / (num_rows - 1);
    let card_width = 1 / (cards_per_row + 4);

    // Add stack cards
    let row = -1;
    for (let c = 0; c < num_cards; c++) {
        let offset = c % cards_per_row;
        if (offset == 0)
            row++;
        let img = document.createElement("img");
        img.draggable = false;
        img.setAttribute("data-index", c);
        img.setAttribute("data-rank", "");
        img.setAttribute("data-suit", "");
        img.classList.add("card-img");
        img.classList.add("tripeaks-card");
        img.classList.add("tripeaks-center");
        let left = card_width * (offset + 1);
        img.style.left = (left * 100).toFixed(2) + "%";
        img.style.top = (CardHeight * row).toFixed(2) + CardHeightUnit;
        img.src = card_back_url();
        img.addEventListener("click", _click_handler);
        img.addEventListener("drop", _drop_handler);
        img.addEventListener("dragenter", _cancel_handler);
        img.addEventListener("dragover", _cancel_handler);
        div.appendChild(img);
    }

    // Add the waste pile
    let img = document.createElement("img");
    img.id = "tripeaks-waste";
    img.classList.add("card-img");
    img.classList.add("cards-well");
    img.classList.add("tripeaks-card");
    img.classList.add("tripeaks-center");
    let left = card_width * (cards_per_row + 3);
    img.style.left = (left * 100).toFixed(2) + "%";
    img.style.top = (CardHeight * (num_rows-1)/2).toFixed(2) + CardHeightUnit;
    img.src = card_well_url();
    div.appendChild(img);
}

function add_transition_card(div) {
    // Add an undisplayed image used for showing card movement transitions
    img = document.createElement("img");
    img.id = "tripeaks-card-transition";
    img.classList.add("card-img");
    img.classList.add("tripeaks-card");
    img.classList.add("tripeaks-center");
    img.style.display = "none";
    div.appendChild(img);
}

//=============================================================================
// Solver
//=============================================================================

function make_key(row, col) {
    return row + "-" + col;
}

function parse_key(key) {
    let parts = key.split("-");
    let row = parseInt(parts[0], 10);
    let col = parseInt(parts[1], 10);
    return [row, col];
}

function solve() {
    // Parameters
    let Adjacency = {
	'ace': ['king', '2'],
	'2': ['ace', '3'],
	'3': ['2', '4'],
	'4': ['3', '5'],
	'5': ['4', '6'],
	'6': ['5', '7'],
	'7': ['6', '8'],
	'8': ['7', '9'],
	'9': ['8', '10'],
	'10': ['9', 'jack'],
	'jack': ['10', 'queen'],
	'queen': ['jack', 'king'],
	'king': ['queen', 'ace'],
    }

    function adjacent(c1, c2) {
        // console.log("adjacent " + c1 + " ? " + c2 +
        //             " => " + Adjacency[c1].includes(c2));
        return Adjacency[c1].includes(c2);
    }

    function fingerprint(card, stack_length, removable) {
        // "card" and "removable" are (x,y)-position pairs
        // "card" is the card to be removed
        // "removable" is all the cards that can be removed
        // "stack_length" is how many cards remain in stack
        // Assumes that removable is already sorted
        return JSON.stringify([card, stack_length, removable])
    }

    function use_position(removable, played, p) {
        // Move position from removable to played
        let index = removable.findIndex((v) => v == p);
        removable.splice(index, 1);
        played.add(p);
        let rc = parse_key(p);
        let row = rc[0];
        let col = rc[1];
        add_removable(removable, played, row, col-1, row+1, col-1);
        add_removable(removable, played, row, col+1, row+1, col);
        removable.sort();
    }

    function add_removable(removable, played, row, col, new_row, new_col) {
        // If there is no card at (row, col) then we add (new_row, new_col)
        // as removable
        let test_key = make_key(row, col)
        if (!PyramidKeys.has(test_key))
            // There was never a card in this position
            return;
        if (!played.has(test_key))
            // There was a card there and it is still there
            return;
        let key = make_key(new_row, new_col);
        if (!PyramidKeys.has(key))
            // There is no card to reveal
            return;
        removable.push(key);
    }

    function find_solution(pos, card, removable, stack,
                           played, history, seen, depth) {
        // console.log(depth + ": " + pos + " " + card +
        //             " (removable " + removable.length + ") " +
        //             "(stack " + stack.length + ")");
        // console.log(removable);
        // console.log(stack);
        // Recursively try removing cards until we have none left
        let fp = fingerprint(card, stack.length, removable);
        if (fp in seen)
            return null;
        seen[fp] = true;
        let hist = [...history];
        hist.push([pos, card]);
        if (removable.length == 0)
            return hist;
        // console.log(removable);
        for (let p of removable) {
            // console.log(p);
            // Try playing each removable card
            // "p" is the encoded string x-y
            let c = pyramid[p];
            if (!adjacent(card, c))
                continue;
            let rem = [...removable];
            let pl = new Set([...played]);
            use_position(rem, pl, p);
            // console.log(rem);
            // console.log(pl);
            let solution = find_solution(p, c, rem, stack, pl,
                                         hist, seen, depth+1);
            if (solution)
                return solution;
        }
        if (stack.length > 0) {
            // Move on to next card in stack
            let solution = find_solution(null, stack[0], removable,
                                         stack.slice(1), played,
                                         hist, seen, depth+1);
            if (solution)
                return solution;
        }
        return null;
    }

    // Build data structures
    let tripeaks = document.getElementById("tripeaks");
    let pyramid = {};
    let stack = new Array(StackSize);
    let removable = [];     // Removable must be an array for fingerprint
    for (let img of tripeaks.querySelectorAll("img")) {
        let rank = img.getAttribute("data-rank");
        // For solving tripeaks, we do not care about suits
        // let suit = img.getAttribute("data-suit");
        if (img.hasAttribute("data-index")) {
            // Must be in stack
            let index = parseInt(img.getAttribute("data-index"), 10);
            // console.log("index " + index);
            stack[StackSize - 1 - index] = rank;
        } else {
            // Must be in pyramid
            let col = parseInt(img.getAttribute("data-col"), 10);
            let row = parseInt(img.getAttribute("data-row"), 10);
            // console.log("pyramid " + x + "," + y);
            let key = make_key(row, col);
            pyramid[key] = rank;
            if (row == 0)
                removable.push(key);
        }
    }
    removable.sort();
    // console.log(removable);
    // console.log(stack);

    let played = new Set();
    let history = [];
    let seen = new Set();
    let moves = find_solution(null, stack[0], removable, stack.slice(1),
                              played, history, seen, 1);
    // console.log(moves);
    if (!moves) {
        alert("No solution found.");
        return;
    }
    player_controls.set_controller(Solution(moves));
}

function reset() {
    assigned_positions = 0;
    let tripeaks = document.getElementById("tripeaks");
    tripeaks.innerHTML = "";
    tripeaks.appendChild(tripeaks_gen());
    let cards = document.getElementById("cards");
    cards.innerHTML = "";
    cards.appendChild(cards_table_gen());
    document.getElementById("solve").disabled = assigned_positions != 52;
    player_controls.set_controller(null);
}

function _solve_handler(ev) {
    solve();
}

function _reset_handler(ev) {
    reset();
}

async function _test_handler(ev) {
    test_fill();
    // await test_move();
}

function init() {
    player_controls = PlayerControls({prev:"s-c-prev",
                                      next:"s-c-next",
                                      play:"s-c-play",
                                      pause:"s-c-pause",
                                      restart:"s-c-restart"});
    for (let rc of PyramidPositions) {
        // rc = row-column
        PyramidKeys.add(make_key(rc[0], rc[1]));
    }
    cards_table_init();
    reset();
    document.getElementById("solve").addEventListener("click", _solve_handler);
    document.getElementById("reset").addEventListener("click", _reset_handler);
    document.getElementById("test").addEventListener("click", _test_handler);
}

window.addEventListener("load", init);

//=============================================================================
// Code for interacting with player controls
// (player as in media player, not user)
//=============================================================================

function Solution(move_list) {
    var moves = move_list;
    var move_position = 0;
    var stack_position = StackSize - 1;
    var waste_src = [];

    function get_state() {
        return {
            has_prev: move_position > 0,
            has_next: move_position < moves.length
        }
    }

    async function forward() {
        // console.log("forward");
        // console.log(moves[move_position]);
        let move = moves[move_position];
        let tripeaks = document.getElementById("tripeaks");
        let waste = document.getElementById("tripeaks-waste");
        let img = document.getElementById("tripeaks-card-transition");
        let p = null;
        if (move[0] == null) {
            // console.log("move from stack");
            let query = "img[data-index='" + stack_position + "']";
            let imgs = tripeaks.querySelectorAll(query);
            waste_src.push(imgs[0].src);
            stack_position--;
            p = move_card(img, imgs[0], "", waste);
        } else {
            // console.log("move from pyramid");
            let rc = parse_key(move[0]);
            let row = rc[0];
            let col = rc[1];
            let query = "img[data-col='" + col + "'][data-row='" + row + "']";
            let imgs = tripeaks.querySelectorAll(query);
            waste_src.push(imgs[0].src);
            p = move_card(img, imgs[0], "", waste);
        }
        move_position++;
        return p;
    }

    async function backward() {
        move_position--;
        let move = moves[move_position];
        let tripeaks = document.getElementById("tripeaks");
        let waste = document.getElementById("tripeaks-waste");
        let img = document.getElementById("tripeaks-card-transition");
        let p = null;
        if (move[0] == null) {
            // console.log("move to stack");
            stack_position++;
            let query = "img[data-index='" + stack_position + "']";
            let imgs = tripeaks.querySelectorAll(query);
            waste_src.pop();
            let end = waste_src.length == 0 ? card_well_url()
                                            : waste_src[waste_src.length - 1];
            p = move_card(img, waste, end, imgs[0]);
        } else {
            // console.log("move to pyramid");
            let rc = parse_key(move[0]);
            let row = rc[0];
            let col = rc[1];
            let query = "img[data-col='" + col + "'][data-row='" + row + "']";
            let imgs = tripeaks.querySelectorAll(query);
            // Knowing that the first card played is always off the stack,
            // we assume that there is a card on the waste pile when
            // moving a card back to the pyramid
            waste_src.pop();
            let end = waste_src[waste_src.length - 1];
            p = move_card(img, waste, end, imgs[0]);
        }
        // console.log("backward");
        // console.log(moves[move_position]);
        return p;
    }

    async function restart() {
        while (move_position > 0)
            await backward();
        move_position = 0;
    }

    return {
        play_interval: 2000,        // interval between moves while playing
        get_state: get_state,
        forward: forward,
        backward: backward,
        restart: restart,
    };
}

//=============================================================================
// Card transition code
//=============================================================================

async function move_card(img, src_img, end_img_url, dst_img) {
    return new Promise((resolve) => {
        // First we make the transition image on top of the source image
        let coord = getElementPositionRelativeToGrandparent(src_img);
        // console.log(coord);
        img.src = src_img.src;
        img.style.left = coord.left + "px";
        img.style.top = coord.top + "px";
        img.style.display = "";
        src_img.src = end_img_url;
        // console.log(img);
        function end_transition(event) {
            // this == img
            // console.log("end transition");
            dst_img.src = img.src;
            img.style.display = "none";
            resolve();
        }
        img.addEventListener("transitionend", end_transition, {once:true});
        // Then we transition the source image to the end image
        // and we move the transition image over the destination image
        coord = getElementPositionRelativeToGrandparent(dst_img);
        // console.log(coord);
        img.style.left = coord.left + "px";
        img.style.top = coord.top + "px";
        img.style.transitionProperty = "all";
        img.style.transitionDuration = "0.5s";
        // console.log(img);
    });
}

function getElementPositionRelativeToGrandparent(element) {
    let left = element.offsetLeft + element.offsetParent.offsetLeft;
    let top = element.offsetTop + element.offsetParent.offsetTop;
    return { left, top };
}

function getElementPositionRelativeToAncestor(element, ancestor) {
    let x = 0;
    let y = 0;
    let currentElement = element;
    while (currentElement && currentElement !== ancestor) {
        x += currentElement.offsetLeft;
        y += currentElement.offsetTop;
      currentElement = currentElement.offsetParent;
    }
    return { x, y };
}

//=============================================================================
// Test code
//=============================================================================

var suit_map = { "S":"spades", "H":"hearts", "D":"diamonds", "C":"clubs" };
var rank_map = { "A":"ace", "K":"king", "Q":"queen", "J":"jack",
                 "10":"10", "9":"9", "8":"8", "7":"7", "6":"6",
                 "5":"5", "4":"4", "3":"3", "2":"2" };
var test_pyramid = [
    '2', '9', '6',
    'K', '10', '10', '10', 'A', '7',
    '7', '5', '7', '4', 'A', '8', '8', '2', '9',
    'J', 'K', '5', 'Q', '8', '6', '10', 'A', '9', 'Q',
]
var test_stack = [
    '2', 'J', '7', '5', '6',
    '6', '3', '9', 'K', '3',
    '4', 'Q', '5', '4', 'J',
    '8', '3', 'J', '3', '2',
    'A', 'K', '4', 'Q',
]

function _test_unused_suit(used, rank) {
    for (let a in suit_map) {
        // a = abbreviation, s = suit
        let key = a + rank;
        if (!(key in used)) {
            used[key] = 1;
            return suit_map[a];
        }
    }
    throw new Error("Too many " + rank + " in test set");
}

function _test_add_position(tripeaks, used, x, y, r) {
    let query = "img[data-col='" + x + "'][data-row='" + y + "']";
    let rank = rank_map[r];
    let suit = _test_unused_suit(used, r);
    let imgs = tripeaks.querySelectorAll(query);
    for (let i = 0; i < imgs.length; i++)
        position_assign(imgs[i], rank, suit);
}

function _test_add_stack(tripeaks, used, n, r) {
    let query = "img[data-index='" + n + "']";
    let rank = rank_map[r];
    let suit = _test_unused_suit(used, r);
    let imgs = tripeaks.querySelectorAll(query);
    for (let i = 0; i < imgs.length; i++)
        position_assign(imgs[i], rank, suit);
}

function test_fill() {
    let tripeaks = document.getElementById("tripeaks");
    let used = {};
    for (let i = 0; i < test_pyramid.length; i++) {
        let pos = PyramidPositions[i];
        let rank = test_pyramid[i];
        _test_add_position(tripeaks, used, pos[1], pos[0], rank);
    }
    for (let i = 0; i < test_stack.length; i++) {
        let index = test_stack.length - 1 - i;
        _test_add_stack(tripeaks, used, index, test_stack[i]);
    }
}

async function test_move() {
    let img = document.getElementById("tripeaks-card-transition");
    let query = "img[data-col='0'][data-row='0']";
    let tripeaks = document.getElementById("tripeaks");
    let imgs = tripeaks.querySelectorAll(query);
    let src = imgs[0];
    let end = "";
    let dst = document.getElementById("tripeaks-waste");
    await move_card(img, src, end, dst);
}
