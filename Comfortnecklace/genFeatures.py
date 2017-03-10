import pandas as pd
#import settings
import os
import numpy as np
#import settings
import sys
# given the time window, generate features and store them into a new csv file

# start = sys.argv[1]
# end = sys.argv[2]
# fname = sys.argv[3]
start = 1488742512490
end = 1488742517439
fname = 'data/test1.csv'
features = []
header = []
keys = ["Z", "X"]
# generate labels for f
featureLabel = ["mean","median","max","min","skew","RMS","kurtosis",\
				"qurt1",'quart3','irq','range','stdev']

# get the csv file as dataframe
df = pd.read_csv(fname)

# get the headers of the features
for k in keys:
	for f in featureLabel:
		tmp = k + '_' + f
		header.append(tmp)

window = df.loc[(df['Time'] >= start) &\
			(df['Time'] <= end)]
window.reset_index()

assert not window.isnull().values.any()
assert window.shape[0] > 2

f = []
for key in keys:
	keywin = window[key]
	irq = keywin.quantile(q=0.75) - keywin.quantile(q=0.25)

	f.extend([
		keywin.mean(),                 #mean
		keywin.median(),               #median
		keywin.max(),                  #max
		keywin.min(),                  #min
		keywin.skew(),                 #skew
		np.sqrt((keywin**2).mean()),   #RMS
		keywin.kurt(),                 #kurtosis
		keywin.quantile(q=0.25),       #1st quartile
		keywin.quantile(q=0.75),       #3rd quartile
		irq,                        #inter quartile range
		keywin.max() - keywin.min(),
		keywin.std()])                 #std dev

features.append(f)

X = np.array(features)
feature_df = pd.DataFrame(X, column = header)

feature_df.to_csv(fname + "_features.csv")
