#!/bin/bash

#
# USAGE:
#    adding the word 'nosat' to the command will prevent saturation from being applied. saturation is boosed by 300% by default.
#    adding the word 'nosingles' to the command will prevent singles from existing after the command has finished spliting the image.
#    adding the word 'all' to the command will save everything.

image=in.png
# get command line switches
if [[ "$*" =~ "nosat" ]]; then
    nosat=1
    echo "no saturation mode enabled"
fi

if [[ "$*" =~ "nosingles" ]]; then
    nosingles=1
    echo "no singles mode enabled"
fi

if [[ "$*" =~ "all" ]]; then
    all=1
    echo "all mode enabled"
fi

if [ $nosat ]; then
    convert ${image} -resize "32x32" "single.png"
elif [ $all ]; then
    convert ${image} -resize "32x32" -modulate 100,300,100 "single.png"
    convert ${image} -resize "32x32" "single-nosat.png"
else
    convert ${image} -resize "32x32" -modulate 100,300,100 "single.png"
fi

if [ $nosingles ]; then
    acnlqrcl "single.png" --title "single" --output "pattern-single.png" &>/dev/null && rm "single.png" &
    disown
elif [ $all ]; then
    acnlqrcl "single-nosat.png" --title "single" --output "pattern-nosat-single.png" &>/dev/null &
    acnlqrcl "single.png" --title "single" --output "pattern-single.png" &>/dev/null &
else
    acnlqrcl "single.png" --title "single" --output "pattern-single.png" &>/dev/null &
    disown
fi

for ((z = 2; z <= 8; z += 1)); do
    zx=$((z * 32))
    if [ $nosat ]; then
        convert ${image} -resize "${zx}x${zx}" "temp${z}.png"
    elif [ $all ]; then
        convert ${image} -resize "${zx}x${zx}" -modulate 100,300,100 "temp${z}.png"
        convert ${image} -resize "${zx}x${zx}" "tempnosat${z}.png"
    else
        convert ${image} -resize "${zx}x${zx}" -modulate 100,300,100 "temp${z}.png"
    fi
    size=$(identify -ping -format "%wx%h" "temp${z}.png")

    width=${size%x*}
    height=${size#*x}

    if [ -d "${z}" ]; then
        rm -dr "$z"
    fi
    mkdir "$z"
    echo "spliting sprite sheet at zoom level ${z}"
    xi=0
    for ((x = 0; x < width; x += 32)); do
        xi=$((xi + 1))
        yi=0
        for ((y = 0; y < height; y += 32)); do
            yi=$((yi + 1))
            if [ $all ]; then
                convert "tempnosat${z}.png" -crop "32x32+${x}+${y}" "$z/nosats${yi}-${xi}.png"
                convert "temp${z}.png" -crop "32x32+${x}+${y}" "$z/s${yi}-${xi}.png"
            else
                convert "temp${z}.png" -crop "32x32+${x}+${y}" "$z/s${yi}-${xi}.png"
            fi

            if [ $all ] && [ $nosingles ]; then
                acnlqrcl "$z/s${yi}-${xi}.png" --title "${yi} - ${xi}" --output "$z/p${yi}-${xi}.png" && rm "$z/s${yi}-${xi}.png" &
                acnlqrcl "$z/nosats${yi}-${xi}.png" --title "${yi} - ${xi}" --output "$z/nosatp${yi}-${xi}.png" && rm "$z/nosats${yi}-${xi}.png" &
            elif [ $all ]; then
                acnlqrcl "$z/s${yi}-${xi}.png" --title "${yi} - ${xi}" --output "$z/p${yi}-${xi}.png" &
                acnlqrcl "$z/nosats${yi}-${xi}.png" --title "${yi} - ${xi}" --output "$z/nosatp${yi}-${xi}.png" &
            elif [ $nosingles ]; then
                acnlqrcl "$z/s${yi}-${xi}.png" --title "${yi} - ${xi}" --output "$z/p${yi}-${xi}.png" && rm "$z/p${yi}-${xi}.png" &
            else
                acnlqrcl "$z/s${yi}-${xi}.png" --title "${yi} - ${xi}" --output "$z/p${yi}-${xi}.png" &
            fi
            if [ -z $all ]; then
                rm "temp${z}.png"
                rm "tempnosat${z}.png"
            fi
        done
    done
done
