CURR_DIR=`pwd`
OUT_DIR=dist

SRC_MAIN=community_detection.c
MAIN_OUT=community_detection.out.js

EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]'

SRC_FILES=`find igraph/src -maxdepth 1 \( -name '*.c' -o -name '*.cc' \) \
  | grep -v -E 'foreign|layout|drl|leiden|gengraph|scg'`

if [[ "$1" == --prod ]]; then
  echo ">>> PRODUCTION MODE"
  export OPTIMIZE="-Os"
else
  echo ">>> DEVELOPEMENT MODE"
  export EMCC_DEBUG=1
  export OPTIMIZE="-O0 -g4"
fi

export LDFLAGS="${OPTIMIZE}"
export CFLAGS="${OPTIMIZE}"
export CXXFLAGS="${OPTIMIZE}"
#https://developers.google.com/web/updates/2019/01/emscripten-npm
emcc \
  ${OPTIMIZE} \
  -s STRICT=1 \
  -s WASM=1 \
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

#  -s MODULARIZE=1 \
#  -s EXPORT_ES6=1 \