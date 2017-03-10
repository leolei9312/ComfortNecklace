# file that loads the features.csv 
# train the model 
# store the model in pickel
import pandas as pd
import numpy as np
import cPickle
from sklearn.ensemble import RandomForestClassifier

XY = pd.read_csv('../proximity_data/features/allFeatures.csv')

features = XY.iloc[:,:-1].as_matrix()
labels = XY['Label'].as_matrix()

assert not np.isnan(features).any()
assert not np.isnan(labels).any()

clf = RandomForestClassifier(n_estimators = 100)

forest = clf.fit(features, labels)

with open('classifier.pkl', 'wb') as fid:
    cPickle.dump(forest, fid)  


# importances = forest.feature_importances_
# std = np.std([tree.feature_importances_ for tree in forest.estimators_],
#              axis=0)
# indices = np.argsort(importances)[::-1]

# # Print the feature ranking
# print("Feature ranking:")

# for f in range(features.shape[1]):
#     print("%d. feature %d (%f)" % (f + 1, indices[f], importances[indices[f]]))

# # Plot the feature importances of the forest
# plt.figure()
# plt.title("Feature importances")
# plt.bar(range(features.shape[1]), importances[indices],
#        color="r", yerr=std[indices], align="center")
# plt.xticks(range(features.shape[1]), indices)
# plt.xlim([-1, features.shape[1]])
# plt.show()





















