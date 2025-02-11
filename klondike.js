// vim: set ai et sw=4 sts=4:

const KlondikeNumCols = 7;
const InitialCardsPerCol = 13;
const NumCards = 52;
const StockSize = NumCards - KlondikeNumCols * (KlondikeNumCols + 1) / 2;
const FoundationRow = -2;
const StockRow = -1;
const KlondikeScale = 1.0;

var RankAbove = {
    'ace': '2',
    '2': '3',
    '3': '4',
    '4': '5',
    '5': '6',
    '6': '7',
    '7': '8',
    '8': '9',
    '9': '10',
    '10': 'jack',
    'jack': 'queen',
    'queen': 'king',
//    'king': 'ace',
    'king': 'none',
}
var SuitMap = { "S":"spades", "H":"hearts", "D":"diamonds", "C":"clubs" };
var RankMap = { "A":"ace", "K":"king", "Q":"queen", "J":"jack", "T":"10",
                "9":"9",   "8":"8",    "7":"7",     "6":"6",
                "5":"5",   "4":"4",    "3":"3",     "2":"2" };
function inverse_map(m) {
    let im = {};
    for (let k in m)
        im[m[k]] = k;
    return im;
}
var InvSuitMap = inverse_map(SuitMap);
var InvRankMap = inverse_map(RankMap);
var SuitOrder = [ "spades", "hearts", "diamonds", "clubs" ];

var assigned_positions = 0;
var player_controls = null;
var klondike_div = null;
var column_card_height = new Array(KlondikeNumCols);
var layout = {};

//=============================================================================
// UI
//=============================================================================

function percent(fraction) {
    return (fraction * 100).toFixed(2) + "%";
}

function height_unit(card_heights) {
    return card_heights.toFixed(2) + CardHeightUnit;
}

function position_assign(img, rank, suit) {
    img.setAttribute("data-rank", rank);
    img.setAttribute("data-suit", suit);
    img.src = card_img_url(rank, suit);
    card_used(rank, suit, true);
    assigned_positions++;
    document.getElementById("solve").disabled = assigned_positions != NumCards;
}

function position_cancel(img, rank, suit) {
    img.setAttribute("data-rank", "");
    img.setAttribute("data-suit", "");
    img.src = card_back_url();
    card_used(rank, suit, false);
    assigned_positions--
    document.getElementById("solve").disabled = assigned_positions != NumCards;
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

function klondike_gen() {
    // Vertically, the game is divided into three sections:
    // the four foundations, the board, and the stock pile.
    // The sections are separate by "section_gap" card-heights;
    //
    // For the foundations, there are 4 non-overlapping card-width
    // positions, evenly spaced horizontally.
    //
    // For the board, there are 7 columns, with each column having
    // (zero-based column number + 1) cards.  The columns do not overlap
    // and are separated by "col_gap" card-width.  Cards in each column
    // overlaps by "card_overlap" card-height.  While the initial board
    // has at most (number of columns) cards, during play, there will
    // be more cards per column.  A priori, we allocate space for
    // twice as many cards per column, but that can be adjusted later
    // when the maximum number of cards in a column for an actual
    // solution is found.
    //
    // For the stock pile, there are StockSize cards.  The
    // available space is evenly divided for the cards, so the
    // any overlap is the result of insufficient space to show
    // the full width of the cards.
    //
    // Note that the space for each card is not necessarily the same as the
    // width of the card image.  To compensate, we set the x position for
    // each card to the middle of the space and depend on CSS to translate
    // the card 50% to the left.  This places each card at the center of
    // its space and guarantees even spacing throughout.

    let div = document.createElement("div");
    div.id = "klondike-div";
    div.classList.add("klondike-div");
    let section_gap = 1 / 2;
    // For foundation
    let foundation_width = 1 / 4 / 2;   // full width over 4 columns, centered
    let foundation_height = (1 + section_gap) * CardHeight;

    // For board
    let card_overlap = 1 / 4;
    let h_scale = ((InitialCardsPerCol * card_overlap) + 1);
    let board_height = (h_scale + section_gap) * CardHeight;
    let col_gap = 1 / 3;
    let card_width = KlondikeScale / (KlondikeNumCols * 1 +
                                     (KlondikeNumCols - 1) * col_gap);
    let gap_width = col_gap * card_width;

    // For stock pile
    let num_rows = 1;
    let row_gap = 1 / 2;
    let stock_height = (num_rows + (num_rows - 1) * row_gap) * CardHeight;

    // Then we combine them so percentages work right
    let div_height = foundation_height + board_height + stock_height;
    let card_height = 1 / h_scale * (board_height / div_height);
    for (let i = 0; i < column_card_height.length; i++)
        column_card_height[i] = card_height;

    // Save some sizing information for use solution playback
    layout.foundation_height = foundation_height;
    layout.board_height = board_height;
    layout.stock_height = stock_height;
    layout.section_gap = section_gap;
    layout.col_gap = col_gap;
    layout.card_width = card_width;
    layout.gap_width = gap_width;
    layout.row_gap = row_gap;

    // Finally, we add the cards
    add_foundation(div);
    add_board(div, card_width, gap_width, card_height, card_overlap,
                   foundation_height);
    add_stock(div, StockSize, num_rows, row_gap,
                   foundation_height + board_height);
    div.style.height = height_unit(div_height);

    return div;
}

function add_foundation(div) {
    let num_foundations = 4;
    let margins = 0.4;
    let width = (1 - margins) / num_foundations / 2;
    let offset = margins / 2;
    for (let i = 0; i < num_foundations; i++) {
        let img = document.createElement("img");
        img.draggable = false;
        img.setAttribute("data-row", FoundationRow);
        img.setAttribute("data-col", i);
        img.setAttribute("data-rank", "");
        img.setAttribute("data-suit", SuitOrder[i]);
        img.classList.add("card-img");
        img.classList.add("cards-well");
        img.classList.add("klondike-card");
        img.classList.add("klondike-center");
        let left = offset + width * (i * 2 + 1);
        img.style.left = percent(left);
        img.style.top = "0px";
        img.src = card_well_url();
        div.appendChild(img);
    }
    layout.foundation_offset = offset;
    layout.foundation_width = width;
}

function add_board(div, card_width, gap_width, card_height,
                   card_overlap, section_height) {
    for (let col = 0; col < KlondikeNumCols; col++) {
        let left = (1 - KlondikeScale) / 2 + col * (card_width + gap_width) +
                   card_width / 2;
        for (let row = 0; row < col + 1; row++) {
            let img = document.createElement("img");
            img.draggable = false;
            img.setAttribute("data-col", col);
            img.setAttribute("data-row", row);
            img.setAttribute("data-rank", "");
            img.setAttribute("data-suit", "");
            img.classList.add("card-img");
            img.classList.add("klondike-card");
            img.classList.add("klondike-center");
            img.style.left = percent(left);
            let h = section_height + row * card_overlap * CardHeight;
            img.style.top = height_unit(h);
            img.src = card_back_url();
            img.addEventListener("click", _click_handler);
            img.addEventListener("drop", _drop_handler);
            img.addEventListener("dragenter", _cancel_handler);
            img.addEventListener("dragover", _cancel_handler);
            div.appendChild(img);
        }
    }
}

function add_stock(div, num_cards, num_rows, row_gap, section_height) {
    // Compute positioning parameters
    let remainder = num_cards % num_rows;
    let cards_per_row = 0;
    if (remainder == 0)
        cards_per_row = num_cards / num_rows;
    else
        cards_per_row = (num_cards - remainder) / (num_rows - 1);
    let card_width = 1 / (cards_per_row + 1);

    // Add stock cards
    let row = -1;
    for (let c = 0; c < num_cards; c++) {
        let offset = c % cards_per_row;
        if (offset == 0)
            row++;
        let img = document.createElement("img");
        img.draggable = false;
        img.setAttribute("data-row", StockRow);
        img.setAttribute("data-col", c);
        img.setAttribute("data-rank", "");
        img.setAttribute("data-suit", "");
        img.classList.add("card-img");
        img.classList.add("klondike-card");
        img.classList.add("klondike-center");
        let left = card_width * (offset + 1);
        img.style.left = percent(left);
        let yoffset = CardHeight * row * (1 + row_gap);
        img.style.top = height_unit(section_height + yoffset);
        img.src = card_back_url();
        img.addEventListener("click", _click_handler);
        img.addEventListener("drop", _drop_handler);
        img.addEventListener("dragenter", _cancel_handler);
        img.addEventListener("dragover", _cancel_handler);
        div.appendChild(img);
    }
    layout.stock_card_width = card_width;
    layout.stock_cards_per_row = cards_per_row;
}

function add_transition_card(div) {
    // Add an undisplayed image used for showing card movement transitions
    img = document.createElement("img");
    img.id = "klondike-card-transition";
    img.classList.add("card-img");
    img.classList.add("klondike-card");
    img.classList.add("klondike-center");
    img.style.display = "none";
    div.appendChild(img);
    return img;
}

function find_board_card(row, col) {
    let query = "img[data-col='" + col + "'][data-row='" + row + "']";
    let imgs = klondike_div.querySelectorAll(query);
    return imgs[0];
}

function find_stock_card(index) {
    return find_board_card(-1, index);
}

function reset() {
    assigned_positions = 0;
    klondike_div.innerHTML = "";
    klondike_div.appendChild(klondike_gen());
    let cards = document.getElementById("cards");
    cards.innerHTML = "";
    cards.appendChild(cards_table_gen());
    document.getElementById("solve").disabled = assigned_positions != NumCards;
    player_controls.set_controller(null);
}

async function _solve_handler(ev) {
    await solve();
}

function _reset_handler(ev) {
    reset();
}

async function _test_handler(ev) {
    test_fill();
}

function init() {
    klondike_div = document.getElementById("klondike");
    player_controls = PlayerControls({prev:"s-c-prev",
                                      next:"s-c-next",
                                      play:"s-c-play",
                                      pause:"s-c-pause",
                                      restart:"s-c-restart"});
    cards_table_init();
    reset();
    document.getElementById("solve").addEventListener("click", _solve_handler);
    document.getElementById("reset").addEventListener("click", _reset_handler);
    document.getElementById("test").addEventListener("click", _test_handler);
}

//=============================================================================
// Solver
//=============================================================================

// Rank-suit based keys for identifying cards

function suit_rank_key(suit, rank) {
    return InvSuitMap[suit] + InvRankMap[rank];
}

// Row-column based keys for identifying positions

function row_col_key(row, col) {
    return row + "/" + col;
}

function parse_row_col_key(key) {
    let parts = key.split("/");
    let row = parseInt(parts[0], 10);
    let col = parseInt(parts[1], 10);
    return [row, col];
}

var card_by_row_col = {};
var card_by_suit_rank = {};

function make_card(suit, rank, row, col, img) {
    let sr_key = suit_rank_key(suit, rank);
    let card = { suit: suit,
                 rank: rank,
                 row: row,
                 col: col,
                 is_red: suit === "hearts" || suit === "diamonds",
                 img: img,
                 fingerprint: sr_key,
                 left: img.style.left,
                 top: img.style.top };
    card_by_suit_rank[sr_key] = card;
    card_by_row_col[row_col_key(suit, rank)] = card;
    return card;
}

function unmake_card(suit, rank, row, col) {
    let key = suit_rank_key(suit, rank);
    let card = card_by_suit_rank[key];
    delete card_by_row_col[row_col_key(card.row, card.col)];
    delete card_by_suit_rank[key];
}

async function solve() {

    let solution = null;
    let max_depth = 0;

    // "foundation" contains the UI card img elements
    // "foundation_cards" contains the list of cards that are on
    //   that foundation (always same suit and in order A->K)

    function make_state(foundation, foundation_cards, board, stock) {

        function fingerprint() {
            // To uniquely identify the state, we construct
            // a string that is the concatenation of the column
            // cards (in position order), the stock pile cards
            // (again in position order), and the foundation
            // lengths (in suit order)
            let fp = [];
            for (let col = 0; col < KlondikeNumCols; col++)
                fp.push(board[col].map(card => card.fingerprint).join(""))
            fp.push(stock.map(card => card.fingerprint).join(""));
            fp.push(SuitOrder.map(suit => foundation_cards[suit]
                                            .length.toString()).join("-"));
            return fp.join("/");
        }

        function copy() {
            // Make a copy of the board state without copying
            // the playing state variables
            // "foundation" is constant since the img element does not move
            // "foundation_cards" needs to be copied per property (array)
            // "board" needs to be copied per column (array)
            // "stock" needs to be copied (array)
            // The array copying can be shallow since the array elements are
            // cards, whose properties never change.
            let new_fc = {};
            for (let suit in foundation_cards)
                new_fc[suit] = foundation_cards[suit].slice();
            let new_b = new Array(board.length);
            for (let i = 0; i < new_b.length; i++)
                new_b[i] = board[i].slice();
            let new_s = stock.slice();
            return make_state(foundation, new_fc, new_b, new_s);
        }

        return { foundation: foundation,
                 foundation_cards: foundation_cards,
                 board: board,
                 stock: stock,
                 copy: copy,
                 fingerprint: fingerprint }
    }

    function log_state(state) {
        console.log(state);
        function c2fp(card) { return card.fingerprint; }
        for (let suit of SuitOrder) {
            let cards = state.foundation_cards[suit];
            console.log("foundation " + suit + ": " +
                        cards.map(c2fp).join(" "));
        }
        for (let col = 0; col < KlondikeNumCols; col++) {
            let cards = state.board[col];
            console.log("column " + col + ": " +
                        cards.map(c2fp).join(" "));
        }
        console.log("stock: " + state.stock.map(c2fp).join(" "));
    }

    function find_solution(old_state, history, seen, depth) {
        // We are looking for *any* solution, so we can
        // return immediately if we find one.

        if (max_depth > 0 && depth >= max_depth)
            return false;
        // console.log(depth);

        // If all the cards are in foundations, we have a solution
        let played_count = 0;
        for (let suit in old_state.foundation_cards)
            played_count += old_state.foundation_cards[suit].length;
        if (played_count == NumCards) {
            solution = history.slice();
            max_depth = depth;
            alert("Found solution using " + solution.length + " steps");
            return true;
        }

        if (false) {
            // For debugging only
            if (depth == 3)
                return false;
            log_state(old_state);
        }

        // If we have already reached this state a different way,
        // there must not be a solution (or we would not still be looking)
        // console.log("test seen");
        // console.log(seen);
        let fp = old_state.fingerprint();
        // console.log(fp);
        // console.log(seen.has(fp));
        if (seen.has(fp))
            return false;
        seen.add(fp);

        // There are different types of moves that we can make:
        // - move card to foundation
        // - shift card(s) from one column to another
        // - deal from stock
        // - move card from foundation
        // If none of these lead to a solution, we are at a dead end

        // console.log("find moves");
        let moves = move_to_foundation(old_state);
        let [p_moves, s_moves] = shift_on_board(old_state);
        // Shifting cards from one column to another is divided into
        // "primary" moves where all consecutive cards at the top of
        // the column are moved, and "secondary" moves where some of
        // the consecutive cards are left in the original column.
        // We try the primary moves first, but only try secondary
        // moves if dealing from stock does not yield a solution.
        moves = moves.concat(p_moves);
        moves = moves.concat(deal_from_stock(old_state));
        moves = moves.concat(s_moves);
        moves = moves.concat(move_from_foundation(old_state));
        // console.log(moves);

        // Try each move and see if we get a solution
        // console.log("try moves");
        for (let move of moves) {
            history.push(move);
            // console.log(move);
            let state = move.apply_func(old_state, move, false);
            // console.log(state.fingerprint());
            if (state)
                if (find_solution(state, history, seen, depth + 1))
                    return true;
            history.pop();
        }

        return false;
    }

    function move_to_foundation(state) {
        // Check if we can play "card" onto any columns
        // There should be 0, 1, or 2 possible moves
        let moves = [];
        for (let col = 0; col < KlondikeNumCols; col++) {
            let column = state.board[col];
            if (column.length == 0)
                continue;
            let top_card = column[column.length - 1];
            let played = state.foundation_cards[top_card.suit];
            if (played.length == 0) {
                if (top_card.rank != "ace")
                    // Can only play an ace to an empty foundation
                    continue;
            } else {
                let card = played[played.length - 1];
                // "card" is the card on the foundation
                if (top_card.rank != RankAbove[card.rank])
                    // Must be upward consecutive to "top_card"
                    continue;
            }
            moves.push({ type: "move_to_foundation",
                         apply_func: apply_move_to_foundation,
                         col: col });
        }
        return moves;
    }

    function apply_move_to_foundation(old_state, move, detailed) {
        let state = old_state.copy();
        let column = state.board[move.col];
        let card = column.pop();
        let foundation = state.foundation_cards[card.suit];
        foundation.push(card);
        if (!detailed)
            return state;
        let moved = [];
        moved.push({ card: card,
                     src_col: move.col,
                     src_row: column.length,
                     src_z: column.length,
                     dst_col: card.suit,
                     dst_row: FoundationRow,
                     dst_z: foundation.length - 1 });
        return { state: state,
                 moved: moved,
                 max_height: column.length };
    }

    function shift_on_board(state) {
        // For each column, look at the top most cards and see
        // if they are consecutive, alternating-color sequences.
        // If so, see if they can be moved to another column.
        // We keep track of possible moves for each column but
        // do not put them on the move list yet.
        let primary_moves = [];
        let secondary_moves = [];
        for (let col = 0; col < KlondikeNumCols; col++) {
            let column = state.board[col];
            if (column.length == 0)
                // Nothing to move
                continue;
            let row = column.length - 1;
            let card = column[row];
            let can_move = true;
            while (can_move) {
                // Check if this is the last card in the column that
                // we can move.  If this is the bottom-most card, we
                // stop.  If the next card below is not one rank above
                // or the same color, we stop.
                can_move = row > 0;
                if (can_move) {
                    let next_card = column[row - 1];
                    can_move = next_card.is_red != card.is_red &&
                               next_card.rank == RankAbove[card.rank];
                }
                // Try moving all cards from here to top card of column
                for (let tcol = 0; tcol < KlondikeNumCols; tcol++) {
                    if (tcol == col)
                        // Cannot move onto the same column
                        continue;
                    let target_column = state.board[tcol];
                    if (target_column.length == 0) {
                        // Empty column.  Only kings can move here.
                        if (card.rank != "king")
                            continue;
                        // Do not move an entire column to another empty one.
                        if (row == 0)
                            continue;
                    } else {
                        // Non-empty column.
                        let top_card = target_column[target_column.length - 1];
                        if (top_card.rank != RankAbove[card.rank])
                            continue;
                        if (top_card.is_red == card.is_red)
                            continue;
                        // Okay to move onto this column
                    }
                    let move = { type: "shift_on_board",
                                 apply_func: apply_shift_on_board,
                                 from_col: col,
                                 from_row: row,
                                 to_col: tcol };
                    if (can_move)
                        secondary_moves.push(move);
                    else
                        primary_moves.push(move);
                }
                // Stop if next card does not continue sequence
                if (can_move)
                    card = column[--row];
            }
        }
        return [primary_moves, secondary_moves];
    }

    function apply_shift_on_board(old_state, move, detailed) {
        let state = old_state.copy();
        let from_column = state.board[move.from_col];
        let to_column = state.board[move.to_col];
        let cards = from_column.splice(move.from_row);
        to_column.push(...cards);
        if (!detailed)
            return state;
        let moved = [];
        for (let i = 0; i < cards.length; i++) {
            let s_row = from_column.length + i;
            let d_row = to_column.length - cards.length + i;
            moved.push({ card: cards[i],
                         src_col: move.from_col,
                         src_row: s_row,
                         src_z: s_row,
                         dst_col: move.to_col,
                         dst_row: d_row,
                         dst_z: d_row });
        }
        return { state: state,
                 moved: moved,
                 max_height: to_column.length };
    }

    function deal_from_stock(state) {
        let moves = [];
        let num_cards = Math.min(state.stock.length, KlondikeNumCols);
        if (num_cards > 0)
            moves.push({ type: "deal_from_stock",
                         apply_func: apply_deal_from_stock,
                         num_cards: num_cards });
        return moves;
    }

    function apply_deal_from_stock(old_state, move, detailed) {
        let state = old_state.copy();
        let cards = state.stock.splice(state.stock.length - move.num_cards);
        for (let i = 0; i < cards.length; i++) {
            let n = cards.length - i - 1;
            let column = state.board[i];
            column.push(cards[n]);
        }
        if (!detailed)
            return state;
        let moved = [];
        let max_height = 0;
        for (let i = 0; i < cards.length; i++) {
            let n = cards.length - i - 1;
            let s_col = state.stock.length + i;
            let d_row = state.board[i].length - 1;
            moved.push({ card: cards[n],
                         src_col: s_col,
                         src_row: StockRow,
                         src_z: s_col,
                         dst_col: i,
                         dst_row: d_row,
                         dst_z: d_row });
            let height = state.board[i].length;
            if (height > max_height)
                max_height = height;
        }
        return { state: state,
                 moved: moved,
                 max_height: max_height };
    }

    function move_from_foundation(state) {
        let moves = [];
        for (let suit in state.foundation_cards) {
            let played = state.foundation_cards[suit];
            if (played.length == 0)
                continue;
            // "card" is the card we consider moving back onto board
            let card = played[played.length - 1];
            // Check if we can play "card" onto any columns
            // There should be 0, 1, or 2 possible moves
            for (let col = 0; col < KlondikeNumCols; col++) {
                let column = state.board[col];
                if (column.length == 0) {
                    if (card.rank != "king")
                        // Can only play a king to an empty column
                        continue;
                } else {
                    let top_card = column[column.length - 1];
                    if (top_card.rank != RankAbove[card.rank])
                        // Must be upward consecutive to "card"
                        continue;
                    if (top_card.is_red == card.is_red)
                        // Must be different color than "card"
                        continue;
                }
                moves.push({ type: "move_from_foundation",
                             apply_func: apply_move_from_foundation,
                             suit: suit,
                             col: col });
            }
        }
        return moves;
    }

    function apply_move_from_foundation(old_state, move, detailed) {
        let state = old_state.copy();
        let column = state.board[move.col];
        let foundation = state.foundation_cards[move.suit];
        let card = foundation.pop();
        column.push(card);
        if (!detailed)
            return state;
        let moved = [];
        moved.push({ card: card,
                     src_row: FoundationRow,
                     src_col: move.suit,
                     src_z: foundation.length,
                     dst_row: column.length - 1,
                     dst_col: move.col,
                     dst_z: column.length - 1 });
        return { state: state,
                 moved: moved,
                 max_height: column.length };
    }

    async function init() {
        // Code wrapped in function so that local variables do not leak
        // to other functions.

        // Build data structures
        let foundation = {};
        let foundation_cards = {};
        let stock = new Array(StockSize);
        let board = new Array(KlondikeNumCols);
        for (let col = 0; col < KlondikeNumCols; col++)
            board[col] = new Array(col + 1);
        for (let img of klondike_div.querySelectorAll("img")) {
            let col = parseInt(img.getAttribute("data-col"), 10);
            let row = parseInt(img.getAttribute("data-row"), 10);
            let suit = img.getAttribute("data-suit");
            let rank = img.getAttribute("data-rank");
            let card = make_card(suit, rank, row, col, img);
            if (row == FoundationRow) {
                foundation[suit] = card;
                foundation_cards[suit] = [];        // Starts empty
            } else if (row == StockRow)
                stock[col] = card;
            else
                board[col][row] = card;
        }
        // console.log("initialized");
        // console.log(foundation);
        // console.log(stock);
        // console.log(board);
        let init_state = make_state(foundation, foundation_cards, board, stock);
        // console.log(init_state);
        // console.log("fingerprint: " + init_state.fingerprint());

        let history = [];
        let seen = new Set();
        find_solution(init_state, history, seen, 0);
        // console.log(solution);
        if (!solution) {
            alert("No solution found.");
            return;
        }
        // console.log(solution);
        controller = await Solution(init_state, solution)
        player_controls.set_controller(controller);
    };

    await init();
}

window.addEventListener("load", init);

//=============================================================================
// Code for interacting with player controls
// (player as in media player, not user)
//=============================================================================

async function Solution(state, move_list) {
    var init_state = state;
    var moves = move_list;
    var move_position = 0;
    var vertical_overlap = 0;

    function get_state() {
        return {
            has_prev: move_position > 0,
            has_next: move_position < moves.length
        }
    }

    async function forward() {
        let move = moves[move_position];
        let promises = [];
        for (let info of move.result.moved) {
            let pos = find_position(info.dst_col, info.dst_row);
            let img = info.card.img;
            promises.push(move_card(img, pos.left, pos.top, info.dst_z));
        }
        move_position++;
        return Promise.all(promises);
    }

    async function backward() {
        move_position--;
        let move = moves[move_position];
        let promises = [];
        for (let info of move.result.moved) {
            let pos = find_position(info.src_col, info.src_row);
            let img = info.card.img;
            promises.push(move_card(img, pos.left, pos.top, info.src_z));
        }
        return Promise.all(promises);
    }

    async function restart() {
        while (move_position > 0)
            await backward();
    }

    function find_position(col, row) {
        if (row == FoundationRow)
            return foundation_position(col);
        else if (row == StockRow)
            return stock_position(col);
        else
            return board_position(col, row);
    }

    function board_position(col, row) {
        let per_col_width = layout.card_width + layout.gap_width;
        let left = (1 - KlondikeScale) / 2 + col * per_col_width +
                   layout.card_width / 2;
        let t = layout.foundation_height + row * vertical_overlap * CardHeight;
        return { left: percent(left),
                 top: height_unit(t) }
    }

    function foundation_position(suit) {
        let n = SuitOrder.indexOf(suit);
        let left = layout.foundation_offset +
                   layout.foundation_width * (n * 2 + 1);
        return { left: percent(left),
                 top: "0px" }
    }

    function stock_position(index) {
        let xoffset = index % layout.stock_cards_per_row
        let left = layout.stock_card_width * (xoffset + 1);
        let row = Math.trunc(index / layout.stock_cards_per_row)
        let yoffset = CardHeight * row * (1 + layout.row_gap);
        let t = yoffset + layout.foundation_height + layout.board_height;
        return { left: percent(left),
                 top: height_unit(t) };
    }

    async function init() {
        // First we run through all the moves to find the maximum
        // number of cards in a column.  Then we back calculate
        // the vertical card overlap.
        let state = init_state;
        let moved = null;
        let max_cards = InitialCardsPerCol;
        for (let move of moves) {
            move.result = move.apply_func(state, move, true);
            if (move.result.max_height > max_cards)
                max_cards = move.result.max_height;
            state = move.result.state;
        }
        // console.log("max height: " + max_cards);
        let h_scale = layout.board_height / CardHeight - layout.section_gap;
        vertical_overlap = (h_scale - 1) / max_cards;

        // To set things up, we move all cards on the board to their
        // new vertical position if necessary.  There should be no
        // cards on the foundations, and the stock cards do not need
        // to be repositioned.
        if (max_cards != InitialCardsPerCol) {
            let promises = [];
            for (let col = 0; col < KlondikeNumCols; col++) {
                let column = init_state.board[col];
                // Start at row 1 since the first card in the column
                // will stay in the same position
                for (let row = 1; row < column.length; row++) {
                    let img = column[row].img;
                    let pos = board_position(col, row);
                    promises.push(move_card(img, pos.left, pos.top, row));
                }
            }
            await Promise.all(promises);
        }
        // console.log("packed board");
    };

    await init();
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

async function move_card(img, left, top, z) {
    return new Promise((resolve) => {
        function end_transition(event) {
            // this == img
            // console.log("end transition");
            this.style.zIndex = z;
            resolve();
        }
        img.addEventListener("transitionend", end_transition, {once:true});
        // Then we transition the source image to the end image
        // and we move the transition image over the destination image
        img.style.transitionProperty = "all";
        img.style.transitionDuration = "0.5s";
        img.style.left = left;
        img.style.top = top;
        img.style.zIndex = z + 1000;
        // console.log(img);
    });
}

//=============================================================================
// Test code
//=============================================================================

var test_klondike = {
    0: [ "DT" ],
    1: [ "H9", "CQ" ],
    2: [ "CA", "CT", "CK" ],
    3: [ "SA", "HQ", "C4", "D3" ],
    4: [ "H5", "SQ", "H3", "DK", "ST" ],
    5: [ "H6", "H2", "SK", "C8", "DJ", "S8" ],
    6: [ "CJ", "D6", "H8", "C7", "HA", "S7", "S6" ],
};
var test_stock = [
    "D8", "HK", "S9", "D4", "DQ", "H7", "S3", "DA",
    "D5", "D7", "S4", "SJ", "D2", "C2", "C5", "S2",
    "H4", "C9", "C3", "HJ", "S5", "C6", "D9", "HT"
];

function _test_suit_rank(card) {
    let suit = SuitMap[card[0]];
    let rank = RankMap[card.slice(1)];
    if (!suit || !rank)
        throw new Error("Bad card: " + card);
    return [suit, rank];
}

function test_fill() {
    let used = new Set();
    for (let col = 0; col < KlondikeNumCols; col++) {
        let cards = test_klondike[col];
        for (let row = 0; row < cards.length; row++) {
            let card = cards[row];
            if (used.has(card))
                throw new Error("Duplicate card: " + card);
            let [suit, rank] = _test_suit_rank(card);
            position_assign(find_board_card(row, col), rank, suit);
            used.add(card);
        }
    }
    for (let i = 0; i < test_stock.length; i++) {
        let index = test_stock.length - 1 - i;
        let card = test_stock[i];
        if (used.has(card))
            throw new Error("Duplicate card: " + card);
        let [suit, rank] = _test_suit_rank(card);
        position_assign(find_stock_card(index), rank, suit);
        used.add(card);
    }
    if (used.size != NumCards)
        throw new Error("Wrong number of cards: " + used.size);
}
