gcc -g \
  louvain_seed_test.c /home/rth/Code/private/master-thesis/igraph-community.js/igraph/src/community.c -I/home/rth/Code/private/master-thesis/igraph-community.js/igraph/  -I/home/rth/Code/private/master-thesis/igraph-community.js/igraph/include -L/usr/local/lib -ligraph -lm -o louvain_seed_test \
  -DIGRAPHJS_DEBUG -DDEBUG \
