#!/usr/bin/python3
# vim: set ai et sw=4 sts=4:

# Extract the card images from the ACBL cards from
# https://acbl.mybigcommerce.com/52-playing-cards/

CardsZip = "cards_png_zip.zip"

RankMap = {
    "A": "ace",
    "K": "king",
    "Q": "queen",
    "J": "jack",
    "10": "10",
    "9": "9",
    "8": "8",
    "7": "7",
    "6": "6",
    "5": "5",
    "4": "4",
    "3": "3",
    "2": "2",
}
SuitMap = {
    "S": "spades",
    "H": "hearts",
    "D": "diamonds",
    "C": "clubs",
}
OtherMap = {
    "blue_back": "card back blue",
    "green_back": "card back green",
    "red_back": "card back red",
}

def extract(cards_file):
    import zipfile, os.path
    with zipfile.ZipFile(cards_file) as zf:
        for name in zf.namelist():
            folder, filename = os.path.split(name)
            if folder != "PNG":
                continue
            root, ext = os.path.splitext(filename)
            if ext != ".png":
                continue
            if len(root) == 2 or len(root) == 3:
                rank = root[:-1]
                suit = root[-1]
                try:
                    rank_name = RankMap[rank]
                    suit_name = SuitMap[suit]
                except KeyError as e:
                    print("Unexpected rank/suit:", e)
                    raise SystemExit(1)
                fn = rank_name + "_of_" + suit_name + ext
            else:
                try:
                    new_name = OtherMap[root]
                except KeyError as e:
                    # print("Ignoring:", e)
                    continue
                else:
                    fn = new_name + ext
            print(name, "=>", fn)
            with zf.open(name, "r") as img:
                with open(fn, "wb") as f:
                    f.write(img.read())


if __name__ == "__main__":
    extract(CardsZip)
