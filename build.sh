CURR_DIR=`pwd`

SRC_MAIN=community_detection.c
MAIN_OUT=community_detection.out.js

EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]'

SRC_FILES=`find igraph/src -maxdepth 1 \( -name '*.c' -o -name '*.cc' \) \
  | grep -v -E 'foreign|layout|drl|leiden|gengraph|scg'`

if [[ "$1" == --prod ]] || [[ "$2" == --prod ]]; then
  echo ">>> PRODUCTION MODE"
  export OPTIMIZE="-Os"
else
  echo ">>> DEVELOPEMENT MODE"
  export EMCC_DEBUG=1
  export OPTIMIZE="-O0 -g4"
fi

if [[ "$1" == --wasm ]] || [[ "$2" == --wasm ]]; then
  echo ">>> WASM MODE"
  export WASM=1
  export OUT_DIR=dist/wasm
else
  echo ">>> ASM.JS MODE"
  export WASM=0
  export OUT_DIR=dist/asm
  export OPTIMIZE="-O0" # debug mode not avaiable without wasm??
fi


export LDFLAGS="${OPTIMIZE}"
export CFLAGS="${OPTIMIZE}"
export CXXFLAGS="${OPTIMIZE}"
#https://developers.google.com/web/updates/2019/01/emscripten-npm
emcc \
  ${OPTIMIZE} \
  -s STRICT=1 \
  -s WASM=$WASM \
  -s MALLOC=emmalloc \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXTRA_EXPORTED_RUNTIME_METHODS=$EXTRA_EXPORTED_RUNTIME_METHODS \
  -I $CURR_DIR/igraph/ \
  -I $CURR_DIR/igraph/src \
  -I $CURR_DIR/igraph/include/ \
  -I $CURR_DIR/igraph/optional/glpk/ \
  $SRC_MAIN \
  $SRC_FILES \
  -o $OUT_DIR/$MAIN_OUT

#  -s ENVIRONMENT="web" \

#  -s MODULARIZE=1 \
#  -s EXPORT_ES6=1 \
