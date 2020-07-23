CURR_DIR=`pwd`

SRC_MAIN=community_detection.c
MAIN_OUT=community-detection.js

EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]'

MAIN_SRC_FILES=`find igraph/src -maxdepth 1 \( -name '*.c' -o -name '*.cc' \) \
  | grep -v -E 'foreign|layout|drl|gengraph|scg|f2c_dummy'`

F2C_SRC_FILES=`find igraph/src/f2c -name '*.c' | grep -v -E 'main'`
LAPACK_SRC_FILES=`find igraph/src/lapack -name '*.c'`
GLPK_SRC_FILES=`find igraph/optional/glpk \( -name '*.c' -o -name '*.cc' \)`
WALKTRAP_FILES=`find igraph/src -maxdepth 1 -name 'walktrap*.cpp'`
SPINGLASS_FILES="igraph/src/clustertool.cpp igraph/src/pottsmodel_2.cpp igraph/src/NetRoutines.cpp igraph/src/NetDataTypes.cpp"

SRC_FILES="$MAIN_SRC_FILES $F2C_SRC_FILES $LAPACK_SRC_FILES $GLPK_SRC_FILES $WALKTRAP_FILES $SPINGLASS_FILES"
#SRC_FILES="$F2C_SRC_FILES $LAPACK_SRC_FILES $MAIN_SRC_FILES $GLPK_SRC_FILES $WALKTRAP_FILES $SPINGLASS_FILES"

# default developement mode and asm.js
ENV=dev
WASM=1

#https://stackoverflow.com/questions/192249/how-do-i-parse-command-line-arguments-in-bash
for i in "$@"; do
  case $i in
    -p|--production)
    ENV=prod
    shift
    ;;
    -a|--asm)
    WASM=0
    shift
    ;;
    *)
    # unknown option
    ;;
  esac
done

#  set EMCC_DEBUG=1 to see verbose emcc output

if [[ "$ENV" == prod ]]; then
echo ">>> PRODUCTION MODE"
  export OPTIMIZE="-O3"
else
  echo ">>> DEVELOPEMENT MODE"
  export OPTIMIZE="-g4"
fi

if [[ $WASM == 0 ]]; then
  echo ">>> ASM.JS MODE"
  export OUT_DIR=dist/asm
else
  echo ">>> WASM MODE"
  export OUT_DIR=dist/wasm
fi


#if [[ "$1" == --prod ]] || [[ "$2" == --prod ]]; then
#  echo ">>> PRODUCTION MODE"
#  export OPTIMIZE="-Os"
#else
#  echo ">>> DEVELOPEMENT MODE"
#  export EMCC_DEBUG=1
#  export OPTIMIZE="-O0 -g4"
#fi

#if [[ "$1" == --wasm ]] || [[ "$2" == --wasm ]]; then
#  echo ">>> WASM MODE"
#  export WASM=1
#  export OUT_DIR=dist/wasm
#else
#  echo ">>> ASM.JS MODE"
#  export WASM=0
#  export OUT_DIR=dist/asm
#  export OPTIMIZE="-O0" # debug mode not avaiable without wasm??
#fi

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
#
#-I $CURR_DIR/igraph/src/f2c \
#  -I $CURR_DIR/igraph/src/lapack \