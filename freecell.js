// vim: set ai et sw=4 sts=4:

const NumColumns = 8;
const NumFoundations = 4
const NumFreeCells = 4
const InitialCardsPerCol = 13;
const NumCards = 52;
const FoundationRow = -1;
const FreeCellRow = -2;
const FreeCellScale = 1;

const debug_level = 0;

var RankOrder = [
    'ace', '2', '3', '4', '5', '6', '7',
    '8', '9', '10', 'jack', 'queen', 'king',
];
var RankAbove = {
    'none': 'ace',
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
    'king': 'none',
};
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
var SuitCount = { "spades": 1, "hearts": 1, "diamonds": 1, "clubs": 1 };

var assigned_positions = 0;
var player_controls = null;
var freecell_div = null;
var column_card_height = new Array(NumColumns);
var layout = {};
var freecell_imgs = [];
var foundation_imgs = [];

//=============================================================================
// UI
//=============================================================================

function percent(fraction) {
    return (fraction * 100).toFixed(2) + "%";
}

function height_unit(card_heights) {
    return card_heights.toFixed(2) + CardHeightUnit;
}

function position_assign(img, rank, suit, key) {
    img.setAttribute("data-rank", rank);
    img.setAttribute("data-suit", suit);
    img.setAttribute("data-key", key);
    img.src = card_img_url(rank, suit);
    card_used(key, true);
    assigned_positions++;
    document.getElementById("solve").disabled = assigned_positions != NumCards;
}

function position_cancel(img, rank, suit, key) {
    img.setAttribute("data-rank", "");
    img.setAttribute("data-suit", "");
    img.setAttribute("data-key", "");
    img.src = card_back_url();
    card_used(key, false);
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
    let key = ev.dataTransfer.getData("key");
    let orig_rank = img.getAttribute("data-rank");
    if (orig_rank) {
        alert("Position is already assigned");
        return;
    }
    position_assign(img, rank, suit, key);
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
    let key = img.getAttribute("data-key");
    position_cancel(img, rank, suit, key);
}

function freecell_gen() {
    // Vertically, the game is divided into two sections:
    // the free cells + foundations, and the board.
    // The sections are separate by "section_gap" card-heights;
    //
    // In the top section, there are 4 free cell piles and 4
    // foundations, laid out across a single row.  The cells
    // are separated from each other by half card-widths, as
    // are the foundations.  The cells are separated from the
    // foundations by a full card width.
    //
    // For the board, there are 8 columns with a total of 52
    // cards.  The first 4 columns have 7 cards and the last
    // 4 have 6.
    // The columns do not overlap and are separated by
    // "col_gap" card-width.  Cards in each column overlap by
    // "card_overlap" card-height.  While the initial board
    // has at most 6 cards, during play, there will
    // be more cards per column.  A priori, we allocate 13
    // cards per column, but that can be adjusted later
    // when the maximum number of cards in a column for an actual
    // solution is found.
    //
    // Note that the space for each card is not necessarily the same as the
    // width of the card image.  To compensate, we set the x position for
    // each card to the middle of the space and depend on CSS to translate
    // the card 50% to the left.  This places each card at the center of
    // its space and guarantees even spacing throughout.

    let div = document.createElement("div");
    div.id = "freecell-div";
    div.classList.add("freecell-div");
    let section_gap = 1 / 2;

    // For free cells + foundations
    let foundation_height = (1 + section_gap) * CardHeight;
    let cell_gap = 1 / 6;
    let foundation_gap = 1 / 6;
    let cell_foundation_gap = 2;

    // For board
    let card_overlap = 1 / 4;
    let h_scale = ((InitialCardsPerCol * card_overlap) + 1);
    let board_height = (h_scale + section_gap) * CardHeight;
    let col_gap = 1 / 3;
    let card_width = FreeCellScale / (NumColumns * 1 +
                                     (NumColumns - 1) * col_gap);
    let gap_width = col_gap * card_width;

    // Then we combine them so percentages work right
    let div_height = board_height + foundation_height;
    let card_height = 1 / h_scale * (board_height / div_height);
    for (let i = 0; i < column_card_height.length; i++)
        column_card_height[i] = card_height;

    // Save some sizing information for use solution playback
    layout.board_height = board_height;
    layout.foundation_height = foundation_height;
    layout.section_gap = section_gap;
    layout.col_gap = col_gap;
    layout.card_width = card_width;
    layout.gap_width = gap_width;
    layout.vertical_overlap = card_overlap;

    // Finally, we add the cards
    add_cells_and_foundations(div, cell_gap, foundation_gap,
                              cell_foundation_gap, 0, foundation_height);
    add_board(div, card_width, gap_width, card_height, card_overlap,
              foundation_height, board_height);
    div.style.height = height_unit(div_height);

    return div;
}

function add_board(div, card_width, gap_width, card_height,
                   card_overlap, section_top, section_height) {
    let min_rows = Math.trunc(NumCards / NumColumns);
    let extra_card = NumCards % NumColumns;
    for (let col = 0; col < NumColumns; col++) {
        let num_rows = min_rows;
        if (col < extra_card)
            num_rows++;
        let left = (1 - FreeCellScale) / 2 + col * (card_width + gap_width) +
                   card_width / 2;
        for (let row = 0; row < num_rows; row++) {
            let img = document.createElement("img");
            img.draggable = false;
            img.setAttribute("data-col", col);
            img.setAttribute("data-row", row);
            img.setAttribute("data-rank", "");
            img.setAttribute("data-suit", "");
            img.classList.add("card-img");
            img.classList.add("freecell-card");
            img.classList.add("freecell-center");
            img.style.left = percent(left);
            let h = section_top + row * card_overlap * CardHeight;
            img.style.top = height_unit(h);
            img.style.zIndex = row;
            img.src = card_back_url();
            img.addEventListener("click", _click_handler);
            img.addEventListener("drop", _drop_handler);
            img.addEventListener("dragenter", _cancel_handler);
            img.addEventListener("dragover", _cancel_handler);
            div.appendChild(img);
        }
    }
}

function add_cells_and_foundations(div, cell_gap, foundation_gap,
                                   cell_foundation_gap,
                                   section_top, section_height) {
    // Compute positioning parameters
    // The widths are based on fractions of the total width.
    // Define each cell and foundation as having 1 unit width.
    // The gaps are all given in the same units, so we have
    // a total number of units of:
    //   4 cells * 1 + 3 cell gaps * cell_gap + cell_foundation_gap +
    //   4 foundations * 1 + 3 foundation gaps * foundation_gap
    // That adds up to FreeCellScale (expressed as a fraction of the
    // total width).  So we can compute the width of a unit relative 
    // to the total width.
    let w = NumFreeCells + (NumFreeCells - 1) * cell_gap +
            cell_foundation_gap +
            NumFoundations + (NumFoundations - 1) * foundation_gap;
    let unit = FreeCellScale / w;

    // Add free cell wells
    for (let c = 0; c < NumFreeCells; c++) {
        let img = document.createElement("img");
        img.draggable = false;
        img.setAttribute("data-row", FreeCellRow);
        img.setAttribute("data-col", c);
        img.setAttribute("data-rank", "");
        img.setAttribute("data-suit", "");
        img.setAttribute("data-key", "");
        img.classList.add("card-img");
        img.classList.add("freecell-card");
        img.classList.add("freecell-center");
        img.classList.add("freecell-foundation");
        let left = unit * ((1 + cell_gap) * c + 0.5);
        img.style.left = percent(left);
        img.style.top = height_unit(section_top);
        img.src = card_foundation_url();
        div.appendChild(img);
        freecell_imgs.push(img);
    }

    // Add foundations
    let xoffset = (NumFoundations + (NumFoundations - 1) * cell_gap +
                   cell_foundation_gap) * unit;
    for (let f = 0; f < NumFoundations; f++) {
        let img = document.createElement("img");
        img.draggable = false;
        img.setAttribute("data-row", FoundationRow);
        img.setAttribute("data-col", f);
        img.setAttribute("data-rank", "");
        img.setAttribute("data-suit", "");
        img.setAttribute("data-key", "");
        img.classList.add("card-img");
        img.classList.add("freecell-card");
        img.classList.add("freecell-center");
        img.classList.add("freecell-foundation");
        let left = xoffset + unit * ((1 + foundation_gap) * f + 0.5);
        img.style.left = percent(left);
        img.style.top = height_unit(section_top);
        img.src = card_foundation_url();
        div.appendChild(img);
        foundation_imgs.push(img);
    }
}

function find_board_card(row, col) {
    let query = "img[data-col='" + col + "'][data-row='" + row + "']";
    let imgs = freecell_div.querySelectorAll(query);
    return imgs[0];
}

function find_freecell(index) {
    return freecell_imgs[index];
}

function find_foundation(index) {
    return foundation_imgs[index];
}

function find_position(col, row) {
    if (row == FreeCellRow)
        return freecell_position(col);
    else if (row == FoundationRow)
        return foundation_position(col);
    else
        return board_position(col, row);
}

function freecell_position(index) {
    let img = find_freecell(index);
    if (!img)
        console.log("image index: " + index);
    return { left: img.style.left,
             top: img.style.top };
}

function foundation_position(index) {
    let img = find_foundation(index);
    return { left: img.style.left,
             top: img.style.top };
}

function board_position(col, row) {
    let per_col_width = layout.card_width + layout.gap_width;
    let left = (1 - FreeCellScale) / 2 + col * per_col_width +
               layout.card_width / 2;
    let t = layout.foundation_height +
            row * layout.vertical_overlap * CardHeight;
    return { left: percent(left),
             top: height_unit(t) };
}

function reset() {
    assigned_positions = 0;
    freecell_imgs = [];
    foundation_imgs = [];
    freecell_div.innerHTML = "";
    freecell_div.appendChild(freecell_gen());
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
    freecell_div = document.getElementById("freecell");
    player_controls = PlayerControls({prev:"s-c-prev",
                                      next:"s-c-next",
                                      play:"s-c-play",
                                      pause:"s-c-pause",
                                      restart:"s-c-restart"});
    cards_table_init(SuitCount);
    reset();
    document.getElementById("solve").addEventListener("click", _solve_handler);
    document.getElementById("reset").addEventListener("click", _reset_handler);
    document.getElementById("test").addEventListener("click", _test_handler);
}

//=============================================================================
// Solver
//=============================================================================

// Rank-suit based keys for identifying equivalent cards

function suit_rank_fp(suit, rank) {
    return InvSuitMap[suit] + InvRankMap[rank];
}

async function solve() {

    let solution = null;
    let max_depth = 1000;
    let seen_depth = -1;

    function make_state(freecells, foundations, board) {

        function fingerprint() {
            // To uniquely identify the state, we construct
            // a string that is the concatenation of the board column
            // cards, the free cell cards, and the foundation cards.
            // We sort each group because order within the group does
            // not affect finding a solution.
            let fp = [];

            let fc_fp = [];
            for (let i = 0; i < NumFreeCells; i++) {
                let card = freecells[i];
                fc_fp.push(card == null ? "" : card.fingerprint)
            }
            fc_fp.sort();
            fp.push(fc_fp.join("-"));

            let f_fp = [];
            for (let i = 0; i < NumFoundations; i++)
                f_fp.push(foundations[i].map(card => card.fingerprint).join(""))
            f_fp.sort();
            fp.push(f_fp.join("-"));

            let b_fp = [];
            for (let col = 0; col < NumColumns; col++)
                b_fp.push(board[col].map(card => card.fingerprint).join(""))
            b_fp.sort();
            fp.push(b_fp.join("-"));

            return fp.join("/");
        }

        function copy() {
            // Make a copy of the board state without copying
            // the playing state variables
            // "board" needs to be copied per column (array)
            // "stock" needs to be copied (array)
            // "waste" needs to be copied (array)
            // The array copying can be shallow since the array elements are
            // cards, whose properties never change.
            let new_fc = freecells.slice();
            let new_f = [];
            for (let i = 0; i < foundations.length; i++)
                new_f[i] = foundations[i].slice();
            let new_b = [];
            for (let i = 0; i < board.length; i++)
                new_b[i] = board[i].slice();
            return make_state(new_fc, new_f, new_b);
        }

        return { board: board,
                 freecells: freecells,
                 foundations: foundations,
                 copy: copy,
                 fingerprint: fingerprint }
    }

    function log_state(state) {
        console.log(state);
        function c2fp(card) { return card.fingerprint; }
        for (let col = 0; col < NumColumns; col++) {
            let cards = state.board[col];
            console.log("column " + col + ": " + cards.map(c2fp).join(" "));
        }
        console.log("freecells: " + state.freecells.map(c2fp).join(" "));
        for (let i = 0; i < NumFoundations; i++) {
            let cards = state.foundations[i];
            console.log("foundation " + i + ": " + cards.map(c2fp).join(" "));
        }
    }

    function make_card(suit, rank, key, row, col, img) {
        // Note that the key and fingerprint are different.  For fingerprint,
        // identical rank+suit cards are interchangeable, but for uniqueness,
        // they are not.
        let card = { suit: suit,
                     rank: rank,
                     key: key,
                     row: row,
                     col: col,
                     is_red: suit === "hearts" || suit === "diamonds",
                     img: img,
                     fingerprint: suit_rank_fp(suit, rank),
                     left: img.style.left,
                     top: img.style.top };
        return card;
    }

    async function find_solution(old_state, history, seen, depth) {
        // We are looking for *any* solution, so we can
        // return immediately if we find one.

        // If all the cards are in the waste pile, we have a solution
        let num_foundation_cards = 0;
        for (let i = 0; i < NumFoundations; i++)
            num_foundation_cards += old_state.foundations[i].length;

        if (debug_level > 1) {
            console.log("depth: " + depth + " - " +
                        num_foundation_cards + " played");
            // log_state(old_state);
        } else if (debug_level) {
            if (seen_depth < depth) {
                console.log("seen depth: " + depth + " - " +
                            num_foundation_cards + " played");
                seen_depth = depth;
            }
        }

        if (num_foundation_cards == NumCards) {
            // solution = history.slice();
            console.log("found solution, " + history.length + " steps");
            max_depth = depth;
            solution = [];
            let last_move = null;
            for (let i = 0; i < history.length; i++) {
                // move.card is non-null only for "board_to_board" moves
                // If the move is not a shift, then we immediately add
                // it (and last move, if any) to the solution
                let move = history[i];
                if (move.card == null) {
                    if (last_move != null) {
                        solution.push(last_move);
                        last_move = null;
                    }
                    solution.push(move);
                    continue;
                }
                // If the previous move was a shift, but it is moving
                // a different card, then we add the previous move to
                // the solution and make keep this move to check whether
                // it can be combined with the next move.  If the last
                // move is moving exactly the same card as this, we
                // combine the two into a single move whose source is
                // from the last move and destination is from this move.
                if (last_move == null)
                    last_move = move;
                else if (last_move.card != move.card) {
                    solution.push(last_move);
                    last_move = move;
                } else {
                    let new_move = { ...last_move };
                    new_move.to_col = move.to_col;
                    last_move = new_move;
                }
            }
            if (last_move)
                solution.push(last_move);
            console.log("reduced solution, " + solution.length + " steps");
            return true;
        }

        // Generate a column order by the lowest rank index of the cards
        // in a column.  This promotes trying to get low ranking cards
        // toward the top of columns earlier, hopefully leading to more
        // cards moving to the foundations faster.
        let column_order = [];
        let column_rank = [];
        for (let col = 0; col < NumColumns; col++) {
            column_order.push(col);
            let min_rank = RankOrder.length;
            for (let card of old_state.board[col]) {
                let n = RankOrder.indexOf(card.rank);
                if (n < min_rank)
                    min_rank = n;
            }
            column_rank.push(min_rank);
        }
        column_order.sort((c1, c2) => column_rank[c1] - column_rank[c2]);

        // If there is a max_depth (eg we found a solution) then
        // we know that we have (max_depth - depth) moves remaining
        // to remove (NumCards - num_foundation_cards) cards.
        let moves_remaining = max_depth - depth;
        let cards_remaining = NumCards - num_foundation_cards;
        if (max_depth > 0 && cards_remaining > moves_remaining) {
            // Possible optimization when looking for shortest solution?
            if (debug_level)
                console.log("pruning " + moves_remaining +
                            " < " + cards_remaining);
            return false;
        }

        // There are several types of moves that we can make:
        // - move a board card onto the foundation (same suit, next rank)
        // - move a board card onto a free cell (cell must be empty)
        // - move a free cell card onto the foundation (same suit, next rank)
        // - move a free cell card onto a board column (cell must not be empty)
        // - move a board stack (series of consecutive alternating-color
        //   cards at the top of a column) onto another stack.
        //   For this option, moving entire stacks seems preferable,
        //   while moving partial stacks seems desperate, so we split
        //   them into primary and secondary moves.  Primary moves are
        //   tried before moving a card to a free cell; secondary moves
        //   are tried afterwards.
        // If none of these lead to a solution, we are at a dead end

        // console.log("find moves");
        let bf_moves = board_to_foundation(old_state, column_order);
        let bfc_moves = board_to_freecell(old_state, column_order);
        let fcb_moves = freecell_to_board(old_state);
        let fcf_moves = freecell_to_foundation(old_state);
        let [p_moves, s_moves] = board_to_board(old_state, column_order);
        let moves = bf_moves.concat(fcf_moves, p_moves,
                                    fcb_moves, bfc_moves, s_moves);
        // console.log(moves);

        // Try each move and see if we get a solution
        // console.log("try moves");
        let any_solution = false;
        for (let move of moves) {
            // console.log(move);
            let state;
            let result;
            if (debug_level > 2) {
                result = move.apply_func(old_state, move, true);
                state = result.state;
            }
            else
                state = move.apply_func(old_state, move, false);

            // If move cannot be applied or resulting state has already
            // been visited, just continue to next move
            if (state == null)
                continue;
            let fp = state.fingerprint();
            if (seen.has(fp)) {
                // console.log("skipping previously visited state");
                continue;
            }
            seen.add(fp);

            // console.log(state);
            if (debug_level > 2) {
                // console.log(state.fingerprint());
                // animate forward action
                let promises = [];
                for (let info of result.moved) {
                    let pos = find_position(info.dst_col, info.dst_row);
                    let img = info.card.img;
                    // console.log("moving " + img.style.left + "," +
                    //             img.style.top + " => " +
                    //             pos.left + "," + pos.top);
                    promises.push(move_card(img, pos.left,
                                            pos.top, info.dst_z, 500));
                }
                // console.log(promises);
                await Promise.allSettled(promises);
                // console.log("moved cards");
            }
            history.push(move);
            let found = await find_solution(state, history, seen, depth + 1);
            history.pop();
            any_solution = any_solution || found;
            // console.log("ending " + depth + " " + move.type);
            if (debug_level > 2) {
                // animate backward action
                let promises = [];
                for (let info of result.moved) {
                    let pos = find_position(info.src_col, info.src_row);
                    let img = info.card.img;
                    promises.push(move_card(img, pos.left,
                                            pos.top, info.src_z, 100));
                }
                await Promise.allSettled(promises);
            }

            // If we want the first solution, we return immediately.
            // Otherwise, we keep trying, but with max_depth set to
            // the smallest known solution size, so we limit the search.
            // (Still takes forever to finish though.)
            if (found)
                return true;
            // console.log("end " + depth + " " + move.type);
        }

        if (debug_level > 1)
            console.log("end depth: " + depth);
        return any_solution;
    }

    function board_to_foundation(state, column_order) {
        let moves = [];
        for (let i = 0; i < NumColumns; i++) {
            let col = column_order[i];
            let column = state.board[col];
            if (column.length == 0)
                continue;
            let card = column[column.length - 1];
            for (let tf = 0; tf < NumFoundations; tf++) {
                let foundation = state.foundations[tf];
                let rank, suit;
                if (foundation.length == 0) {
                    if (card.rank != "ace")
                        continue;
                } else {
                    let fcard = foundation[foundation.length - 1];
                    if (card.suit != fcard.suit ||
                        card.rank != RankAbove[fcard.rank])
                            continue;
                }
                let move = { type: "board_to_foundation",
                             card: null,
                             apply_func: apply_board_to_foundation,
                             from_col: col,
                             to_f: tf };
                moves.push(move);
                break;
            }
        }
        return moves;
    }

    function apply_board_to_foundation(old_state, move, detailed) {
        let state = old_state.copy();
        let from_column = state.board[move.from_col];
        let to_foundation = state.foundations[move.to_f];
        let card = from_column.pop();
        if (card == null)
            console.log("pushing null card in apply_board_to_foundation");
        to_foundation.push(card);
        if (!detailed)
            return state;
        let moved = [{ card: card,
                       src_col: move.from_col,
                       src_row: from_column.length,
                       src_z: from_column.length,
                       dst_col: move.to_f,
                       dst_row: FoundationRow,
                       dst_z: to_foundation.length - 1 }];
        return { state: state,
                 moved: moved,
                 max_height: from_column.length };
    }

    function board_to_freecell(state, column_order) {
        let moves = [];
        for (let i = 0; i < NumColumns; i++) {
            let col = column_order[i];
            let column = state.board[col];
            if (column.length == 0)
                continue;
            // Never put an ace to a free cell since they can go to foundation
            let card = column[column.length - 1];
            if (card.rank == "ace")
                continue;
            for (let tfc = 0; tfc < NumFreeCells; tfc++) {
                if (state.freecells[tfc] != null)
                    continue;
                let move = { type: "board_to_freecell",
                             card: null,
                             apply_func: apply_board_to_freecell,
                             from_col: col,
                             to_fc: tfc };
                moves.push(move);
                break;
            }
        }
        return moves;
    }

    function apply_board_to_freecell(old_state, move, detailed) {
        let state = old_state.copy();
        let from_column = state.board[move.from_col];
        let card = from_column.pop();
        state.freecells[move.to_fc] = card;
        if (!detailed)
            return state;
        let moved = [{ card: card,
                       src_col: move.from_col,
                       src_row: from_column.length,
                       src_z: from_column.length,
                       dst_col: move.to_fc,
                       dst_row: FreeCellRow,
                       dst_z: 0 }];
        return { state: state,
                 moved: moved,
                 max_height: from_column.length };
    }

    function freecell_to_foundation(state) {
        let moves = [];
        for (let i = 0; i < NumFreeCells; i++) {
            let card = state.freecells[i];
            if (card == null)
                continue;
            for (let tf = 0; tf < NumFoundations; tf++) {
                let foundation = state.foundations[tf];
                let rank, suit;
                if (foundation.length == 0) {
                    if (card.rank != "ace")
                        continue;
                } else {
                    let fcard = foundation[foundation.length - 1];
                    if (card.suit != fcard.suit ||
                        card.rank != RankAbove[fcard.rank])
                            continue;
                }
                let move = { type: "freecell_to_foundation",
                             card: null,
                             apply_func: apply_freecell_to_foundation,
                             from_fc: i,
                             to_f: tf };
                moves.push(move);
                break;  // because we can only move to one foundation
            }
        }
        return moves;
    }

    function apply_freecell_to_foundation(old_state, move, detailed) {
        let state = old_state.copy();
        let to_foundation = state.foundations[move.to_f];
        let card = state.freecells[move.from_fc];
        if (card == null)
            console.log("pushing null card in apply_freecell_to_foundation");
        to_foundation.push(card);
        state.freecells[move.from_fc] = null;
        if (!detailed)
            return state;
        let moved = [{ card: card,
                       src_col: move.from_fc,
                       src_row: FreeCellRow,
                       src_z: 0,
                       dst_col: move.to_f,
                       dst_row: FoundationRow,
                       dst_z: to_foundation.length - 1 }];
        return { state: state,
                 moved: moved,
                 max_height: 0 };
    }

    function freecell_to_board(state) {
        let moves = [];
        for (let i = 0; i < NumFreeCells; i++) {
            let fc_card = state.freecells[i];
            if (fc_card == null)
                continue;
            for (let col = 0; col < NumColumns; col++) {
                let column = state.board[col];
                let can_move = column.length == 0;
                if (!can_move && column.length >= 0) {
                    let card = column[column.length - 1];
                    if (card.rank == RankAbove[fc_card.rank] &&
                        card.is_red != fc_card.is_red)
                            can_move = true;
                }
                if (can_move) {
                    let move = { type: "freecell_to_board",
                                 card: null,
                                 apply_func: apply_freecell_to_board,
                                 from_fc: i,
                                 to_col: col };
                    moves.push(move);
                    // no break since we can move to multiple columns
                }
            }
        }
        return moves;
    }

    function apply_freecell_to_board(old_state, move, detailed) {
        let state = old_state.copy();
        let to_column = state.board[move.to_col];
        let card = state.freecells[move.from_fc];
        to_column.push(card);
        state.freecells[move.from_fc] = null;
        if (!detailed)
            return state;
        let moved = [{ card: card,
                       src_col: move.from_fc,
                       src_row: FreeCellRow,
                       src_z: 0,
                       dst_col: move.to_col,
                       dst_row: to_column.length - 1,
                       dst_z: to_column.length - 1 }];
        return { state: state,
                 moved: moved,
                 max_height: to_column.length };
    }

    function board_to_board(state, column_order) {

        function top_stack(col) {
            let column = state.board[col];
            if (column.length == 0)
                return { col: col,
                         row: -1,
                         length: 0,
                         card: null };
            let row = column.length - 1;
            let card = column[row];
            while (row > 0) {
                next_card = column[row - 1];
                if (next_card.is_red == card.is_red ||
                    next_card.rank != RankAbove[card.rank])
                        break;
                row--;
                card = next_card;
            }
            return { length: column.length - row,
                     col: col,
                     row: row,
                     card: card };
        }

        function can_move(stacks, fcol, tcol, max_stack) {
            // can_move finds all the moves from column fcol to
            // column tcol, up to max_stack cards.
            // The moves are separated into primary and secondary moves.
            // Primary moves are those that should be tried before dealing
            // from stack.  Secondary and tertiary moves are those that
            // should be tried after.  Tertiary moves are those that move
            // part of a stack onto another of the same suit; they leave
            // the top card the same in both columns, so are less interesting.
            // Assumes that fcol != tcol.
            // console.log("can move: " + col + ", " + row + " => " + tcol);
            let primary = [];
            let secondary = [];
            let tertiary = [];
            let fstack = stacks[fcol];
            if (fstack.length == 0) {
                // If "from" column is empty, there are no moves available.
                return {primary, secondary, tertiary};
            }
            let tstack = stacks[tcol];
            let fc = state.board[fcol];
            let tc = state.board[tcol];
            if (tc.length == 0) {
                // If the "to" column is empty, we try to move different
                // number of cards from the column.  The only move we
                // do not attempt is to move all of the "from" column
                // (starting with row 0) to the "to" column since that
                // cannot help find a solution.
                let count = 1;
                for (let row = fstack.row; row < fc.length; row++) {
                    if (count++ >= max_stack)
                        break;
                    let move = { type: "board_to_board",
                                 card: fc[row],
                                 apply_func: apply_board_to_board,
                                 from_col: fcol,
                                 from_row: row,
                                 to_col: tcol };
                    if (row != 0) {
                        if (row == fstack.row)
                            primary.push(move);
                        else
                            // XXX: When do we ever want to do this?
                            // secondary.push(move);
                            ;
                    }
                }
            } else {
                let tcard = tc[tc.length - 1];
                let count = 1;
                for (let row = fstack.row; row < fc.length; row++) {
                    if (count++ >= max_stack)
                        break;
                    let fcard = fc[row];
                    if (tcard.rank != RankAbove[fcard.rank] ||
                        tcard.is_red == fcard.is_red)
                            continue;
                    // to make the move possible
                    let move = { type: "board_to_board",
                                 card: fcard,
                                 apply_func: apply_board_to_board,
                                 from_col: fcol,
                                 from_row: row,
                                 to_col: tcol };
                    // There are three possibilities:
                    // - The destination column is a different suit than the
                    //   source stack.  This is a secondary move that we can
                    //   explore later (after dealing from stock).
                    //   Do not bother moving a partial stack over another
                    //   suit since that rarely results in a solution.
                    // - We are moving the entire stack to a new column.
                    //   We want to explore this first since it reveals
                    //   a new stack under the current one.
                    // - We are moving part of the stack to a new column.
                    //   This can be useful if we are creating a larger
                    //   stack in the new column, which we can explore
                    //   now; otherwise, we explore later (after moving
                    //   entire stacks onto different suits).
                    if (row == fstack.row)
                        primary.push(move);
                    else {
                        let moving = fc.length - row;
                        if (moving + tstack.length > fstack.length)
                            secondary.push(move);
                        else
                            tertiary.push(move);
                    }
                    break;
                }
            }
            return {primary, secondary, tertiary};
        }

        // First we find the number of empty free cells and foundations
        // because they affect how many cards in a stack we can move.
        // Without using any empty foundations, we can move at most
        // (empty_freecells+1) cards.  For each empty foundation,
        // we can move an additional (empty_freecells+1) cards.
        // So the total number of cards in a stack that we can move
        // is (empty_freecells+1)*(empty_foundations+1).
        let empty_freecells = 0;
        for (let i = 0; i < NumFreeCells; i++)
            if (state.freecells[i] == null)
                empty_freecells++;
        let empty_foundations = 0;
        for (let i = 0; i < NumFoundations; i++)
            if (state.foundations[i].length == 0)
                empty_foundations++;
        let max_stack = (empty_freecells + 1) * (empty_foundations + 1);

        // Now we find the stacks (consecutive cards of the same suit)
        // for each column.  If any stack is complete (A->K), we create
        // a primary move to put the stack away.
        let primary_moves = [];
        let secondary_moves = [];
        let tertiary_moves = [];
        let stacks = [];
        for (let col = 0; col < NumColumns; col++)
            stacks[col] = top_stack(col);

        for (let fi = 0; fi < NumColumns; fi++) {
            let fcol = column_order[fi];
            for (let ti = 0; ti < NumColumns; ti++) {
                let tcol = column_order[ti];
                if (fcol == tcol)
                    continue;
                let moves = can_move(stacks, fcol, tcol, max_stack);
                primary_moves.push(...moves.primary);
                secondary_moves.push(...moves.secondary);
                tertiary_moves.push(...moves.tertiary);
            }
        }
        // combine secondary and tertiary moves since they will all
        // be tried after dealing from stock.
        secondary_moves.push(...tertiary_moves);
        return [primary_moves, secondary_moves];
    }

    function apply_board_to_board(old_state, move, detailed) {
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

    async function init() {
        // Code wrapped in function so that local variables do not leak
        // to other functions.

        // Build data structures
        let board = [];
        for (let col = 0; col < NumColumns; col++)
            board[col] = [];
        let freecells = [];
        for (let i = 0; i < NumFreeCells; i++)
            freecells.push(null);
        let foundations = [];
        for (let i = 0; i < NumFoundations; i++)
            foundations.push([]);
        for (let img of freecell_div.querySelectorAll("img")) {
            let col = parseInt(img.getAttribute("data-col"), 10);
            let row = parseInt(img.getAttribute("data-row"), 10);
            let suit = img.getAttribute("data-suit");
            let rank = img.getAttribute("data-rank");
            let key = img.getAttribute("data-key");
            let card = make_card(suit, rank, key, row, col, img);
            if (row != FreeCellRow && row != FoundationRow)
                board[col][row] = card;
        }
        // console.log("initialized");
        // console.log(waste);
        // console.log(board);
        // console.log(stock);
        let init_state = make_state(freecells, foundations, board);
        // console.log(init_state);
        // console.log("fingerprint: " + init_state.fingerprint());

        let history = [];
        let seen = new Set();
        seen.add(init_state.fingerprint());
        if (!await find_solution(init_state, history, seen, 0)) {
            alert("No solution found.");
            return;
        }
        alert("Found solution using " + solution.length + " steps");
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
            promises.push(move_card(img, pos.left, pos.top, info.dst_z, 500));
        }
        move_position++;
        return Promise.allSettled(promises);
    }

    async function backward() {
        move_position--;
        let move = moves[move_position];
        let promises = [];
        for (let info of move.result.moved) {
            let pos = find_position(info.src_col, info.src_row);
            let img = info.card.img;
            promises.push(move_card(img, pos.left, pos.top, info.src_z, 500));
        }
        return Promise.allSettled(promises);
    }

    async function restart() {
        let promises = [];
        for (let col = 0; col < NumColumns; col++)
            for (let card of init_state.board[col])
                promises.push(move_card(card.img, card.init_left,
                                        card.init_top, card.init_z, 500));
        return Promise.allSettled(promises);
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
        layout.vertical_overlap = (h_scale - 1) / max_cards;

        // To set things up, we move all cards on the board to their
        // new vertical position if necessary.  There should be no
        // cards on the foundations, and the stock cards do not need
        // to be repositioned.
        if (max_cards != InitialCardsPerCol) {
            let promises = [];
            for (let col = 0; col < NumColumns; col++) {
                let column = init_state.board[col];
                // Start at row 1 since the first card in the column
                // will stay in the same position
                for (let row = 1; row < column.length; row++) {
                    let img = column[row].img;
                    let pos = board_position(col, row);
                    promises.push(move_card(img, pos.left, pos.top, row, 500));
                }
            }
            await Promise.allSettled(promises);
        }
        // console.log("packed board");

        // Now we record the card positions so that we can reset quickly
        function record_pos(card) {
            card.init_left = card.img.style.left;
            card.init_top = card.img.style.top;
            card.init_z = card.img.style.zIndex;
        }
        for (let col = 0; col < NumColumns; col++)
            for (let card of init_state.board[col])
                record_pos(card);
        // free cells and foundations should be empty so no need to record
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

async function move_card(img, left, top, z, duration) {
    // duration in milliseconds
    return new Promise((resolve) => {
        img.style.transitionProperty = "all";
        img.style.transitionDuration = (duration / 1000).toFixed(2) + "s";
        img.style.left = left;
        img.style.top = top;
        img.style.zIndex = z;
        // Instead of waiting for a transitionend event, we use a sleep
        // timer, because Firefox seems to not guarantee that the
        // transitionend events get fired when there are lots of cards
        // being animated.  There is also a question of how many times
        // transitionend if fired if more than one property (eg left
        // and top) are animated.
        setTimeout(resolve, duration);
        // console.log(img);
    });
}

//=============================================================================
// Test code
//=============================================================================

function test_fill() {

    // Microsoft Solitaire FreeCell game #2313386
    var test_freecell = {
        0: [ "AS", "JC", "6D", "KC", "TS", "3C", "8S" ],
        1: [ "3H", "QD", "5C", "6S", "7C", "4C", "QC" ],
        2: [ "QH", "8H", "KS", "TH", "4S", "7D", "5S" ],
        3: [ "5H", "JH", "AH", "TC", "AD", "2S", "9C" ],
        4: [ "3S", "2C", "6H", "TD", "2H", "2D" ],
        5: [ "4H", "KD", "KH", "JS", "5D", "9S" ],
        6: [ "9D", "AC", "7S", "3D", "8C", "QS" ],
        7: [ "8D", "9H", "JD", "4D", "6C", "7H" ],
    };

    function suit_rank(card) {
        let suit = SuitMap[card[1]];
        let rank = RankMap[card[0]];
        if (!suit || !rank)
            throw new Error("Bad card: " + card);
        return [suit, rank];
    }

    let assigned = 0;
    let used = new Set();
    for (let col = 0; col < NumColumns; col++) {
        let cards = test_freecell[col];
        for (let row = 0; row < cards.length; row++) {
            let card = cards[row];
            if (used.has(card))
                throw new Error("Duplicate card: " + card);
            used.add(card);
            let [suit, rank] = suit_rank(card);
            let index = 0;
            let key = card_key(rank, suit, index); 
            position_assign(find_board_card(row, col), rank, suit, key);
            assigned++;
        }
    }
    if (assigned != NumCards)
        throw new Error("Wrong number of cards: " + assigned);
}
