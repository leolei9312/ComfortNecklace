import cPickle
import sys
import numpy as np
# XY = pd.read_csv('../proximity_data/features/ML_features.csv')

# print map(float, sys.argv[1].split(',') )
lst = sys.argv[1]
features = map(float, lst.split(','))
features = np.array(features).reshape((1, -1))

# features = XY.iloc[:,:-1].as_matrix()
# features = sys.argv[1]
# print features
features = np.nan_to_num(features)

with open('classifier.pkl', 'rb') as fid:
    model = cPickle.load(fid)

    print model.predict(features)