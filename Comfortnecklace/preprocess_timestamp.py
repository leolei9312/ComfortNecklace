import csv

testNum = '2'
featuresPath = './data/test'+testNum+'/features.csv'
labelsPath = './data/test'+testNum+'/labels.txt'
targetPath = './data/test'+testNum+'/labeled_features.csv'

with open(featuresPath, 'rb') as f1:
    reader1 = csv.reader(f1)
    features = list(reader1)
    with open(labelsPath, 'rb') as f2:
		labels = f2.readlines()
		startTime = int(labels[0])
		labels = labels[1:]
		headers = ["Time","Top","Bottom","qW","qX","qY","qZ","aX","aY","aZ","Cal","LeanForward","Label"]
		outputFeatures = []
		labelIndex = 0
		currLabelTime = int(labels[labelIndex])

		for index,row in enumerate(features):
			timestamp = int(row[0])
			if timestamp > startTime:
				newrow = row[:]
				if timestamp > currLabelTime and labelIndex < len(labels) - 1:
					print index,timestamp
					newrow.append("1")
					labelIndex += 1				
					try:
						currLabelTime = int(labels[labelIndex])
					except:
						break
				else:
					newrow.append("0")
				outputFeatures.append(newrow)

		with open(targetPath, 'wb') as f3:
		    writer = csv.writer(f3)
		    writer.writerow(headers)
		    for row in outputFeatures:
			    writer.writerow(row)
